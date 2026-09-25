// Lógica de la función edge: registro de donaciones, panel de administración,
// Excel y envío por WhatsApp al número de la administración.
// Corre en el runtime Deno del sitio; sin dependencias npm ni node_modules.

const TEXT = new TextEncoder();
const GRAPH_VERSION = "v21.0";
const DEFAULT_ADMIN_NUMBER = "51951012633";
const TABLE = "donaciones";
const DONATION_TYPE = "TABLETA GRÁFICA";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const FIELD_ORDER = [
  "iglesia", "nombre_pastor", "primer_nombre", "apellido_paterno", "apellido_materno",
  "dni_ce", "direccion", "direccion_linea_2", "ciudad", "estado_region", "codigo_postal",
  "pais", "distrito", "provincia", "departamento", "email", "telefono",
  "codigo_identificacion", "fecha_recepcion",
];
const FIELD_LABELS = {
  iglesia: "Iglesia",
  nombre_pastor: "Nombre del Pastor",
  primer_nombre: "Primer Nombre",
  apellido_paterno: "Apellido Paterno",
  apellido_materno: "Apellido Materno",
  dni_ce: "DNI / CE",
  direccion: "Dirección",
  direccion_linea_2: "Dirección (línea 2)",
  ciudad: "Ciudad",
  estado_region: "Estado / Región",
  codigo_postal: "Código Postal",
  pais: "País",
  distrito: "Distrito",
  provincia: "Provincia",
  departamento: "Departamento",
  email: "Email",
  telefono: "Teléfono",
  codigo_identificacion: "Código de identificación de la tableta",
  fecha_recepcion: "Fecha de recepción",
};
const EXCEL_HEADERS = [...FIELD_ORDER.map((k) => FIELD_LABELS[k]), "Tipo de donación"];

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

function clean(value) {
  return String(value ?? "").replace(/[<>]/g, "");
}

function txtField(label, raw, max, optional = false) {
  const value = clean(raw).trim();
  if (!value) return optional ? "" : null;
  if (value.length > max) return { error: `${label} no puede superar ${max} caracteres` };
  return value;
}

function validateDonacion(input) {
  const raw = input && typeof input === "object" ? input : {};
  const data = {};
  const rules = [
    ["iglesia", () => txtField("Iglesia", raw.iglesia, 150, true)],
    ["nombre_pastor", () => txtField("Nombre del Pastor", raw.nombre_pastor, 150)],
    ["primer_nombre", () => txtField("Primer Nombre", raw.primer_nombre, 80)],
    ["apellido_paterno", () => txtField("Apellido Paterno", raw.apellido_paterno, 80)],
    ["apellido_materno", () => txtField("Apellido Materno", raw.apellido_materno, 80)],
    ["dni_ce", () => regexField(raw.dni_ce, /^[A-Za-z0-9]{8,12}$/, "DNI/CE inválido (8 a 12 letras o números, sin espacios)")],
    ["direccion", () => txtField("Dirección", raw.direccion, 200)],
    ["direccion_linea_2", () => txtField("Dirección (línea 2)", raw.direccion_linea_2, 200, true)],
    ["ciudad", () => txtField("Ciudad", raw.ciudad, 120)],
    ["estado_region", () => txtField("Estado / Región", raw.estado_region, 120)],
    ["codigo_postal", () => regexField(raw.codigo_postal, /^[A-Za-z0-9 -]{3,10}$/, "Código postal inválido")],
    ["pais", () => txtField("País", raw.pais, 120)],
    ["distrito", () => txtField("Distrito", raw.distrito, 120)],
    ["provincia", () => txtField("Provincia", raw.provincia, 120)],
    ["departamento", () => txtField("Departamento", raw.departamento, 120)],
    ["email", () => {
      const value = String(raw.email ?? "").trim();
      if (!value || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return { error: "Email inválido" };
      }
      return value;
    }],
    ["telefono", () => regexField(raw.telefono, /^\+?[0-9 ()-]{7,20}$/, "Teléfono inválido (solo números, puede iniciar con +)")],
    ["codigo_identificacion", () => {
      const value = String(raw.codigo_identificacion ?? "").trim().toUpperCase();
      if (!/^[A-Za-z0-9-]{3,40}$/.test(value)) {
        return { error: "Código inválido (3 a 40 letras, números o guiones)" };
      }
      return value;
    }],
    ["fecha_recepcion", () => regexField(raw.fecha_recepcion, /^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha válida")],
  ];
  for (const [field, rule] of rules) {
    const result = rule();
    if (result === null) return { ok: false, field, message: `${FIELD_LABELS[field]} es obligatorio` };
    if (result && typeof result === "object") return { ok: false, field, message: result.error };
    data[field] = result;
  }
  return { ok: true, data };
}

function regexField(raw, regex, message) {
  const value = String(raw ?? "").trim();
  if (!regex.test(value)) return { error: message };
  return value;
}

// ---------- Cifrado AES-GCM de los datos personales (columna `data`) ----------

const KDF_SALT = TEXT.encode("vgr-donaciones-aes-v1");
const B64 = {
  encode(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  },
  decode(text) {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};

function createCrypto(env) {
  let key = null;
  let keySource = null;
  const dataKey = async () => {
    const password = env("ADMIN_PASSWORD");
    if (!password) throw new Error("service_not_configured");
    if (key && keySource === password) return key;
    const material = await crypto.subtle.importKey("raw", TEXT.encode(password), "PBKDF2", false, ["deriveKey"]);
    key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: KDF_SALT, iterations: 100000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    keySource = password;
    return key;
  };
  return {
    async encrypt(obj) {
      const k = await dataKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, TEXT.encode(JSON.stringify(obj)));
      return `v1:${B64.encode(iv)}:${B64.encode(new Uint8Array(ciphertext))}`;
    },
    async decrypt(payload) {
      const [version, ivB64, ctB64] = String(payload ?? "").split(":");
      if (version !== "v1" || !ivB64 || !ctB64) throw new Error("decrypt_failed");
      const k = await dataKey();
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: B64.decode(ivB64) }, k, B64.decode(ctB64));
      return JSON.parse(new TextDecoder().decode(plaintext));
    },
  };
}

// ---------- Constructor de Excel (xlsx) sin dependencias ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files, now = new Date()) {
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = TEXT.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, file.data);
    const entry = new Uint8Array(46 + name.length);
    const ev = new DataView(entry.buffer);
    ev.setUint32(0, 0x02014b50, true);
    ev.setUint16(4, 20, true);
    ev.setUint16(6, 20, true);
    ev.setUint16(12, dosTime, true);
    ev.setUint16(14, dosDate, true);
    ev.setUint32(16, crc, true);
    ev.setUint32(20, file.data.length, true);
    ev.setUint32(24, file.data.length, true);
    ev.setUint16(28, name.length, true);
    ev.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length + file.data.length;
  }
  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, eocd], { type: "application/zip" });
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildXlsxBlob(rows) {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnLetter(colIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const files = [
    {
      name: "[Content_Types].xml",
      data: TEXT.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      ),
    },
    {
      name: "_rels/.rels",
      data: TEXT.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    {
      name: "xl/workbook.xml",
      data: TEXT.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Donaciones" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: TEXT.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: TEXT.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`,
      ),
    },
  ];
  const blob = zipStore(files);
  return new Blob([blob], { type: XLSX_MIME });
}

function donationRow(donation) {
  return [...FIELD_ORDER.map((field) => donation[field] ?? ""), DONATION_TYPE];
}

function excelFilename(donation) {
  return `donacion-${donation.codigo_identificacion}-${donation.fecha_recepcion}.xlsx`;
}

// ---------- Envío por WhatsApp Cloud API ----------

function whatsappAdminNumber(env) {
  return String(env("WHATSAPP_ADMIN_NUMBER") || DEFAULT_ADMIN_NUMBER).replace(/\D/g, "");
}

async function sendDonationExcel({ env, donation, fetchImpl = globalThis.fetch, origin = "" }) {
  const apiKey = env("WHATSAPP_API_KEY");
  const phoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  const to = whatsappAdminNumber(env);
  if (!apiKey || !phoneId || !to) return { sent: false, reason: "service_not_configured" };
  const nombre = `${donation.primer_nombre} ${donation.apellido_paterno} ${donation.apellido_materno}`.trim();
  const graph = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}`;
  try {
    const form = new FormData();
    form.set("messaging_product", "whatsapp");
    form.set("file", buildXlsxBlob([EXCEL_HEADERS, donationRow(donation)]), excelFilename(donation));
    const upload = await fetchImpl(`${graph}/media`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const uploadBody = await upload.json().catch(() => null);
    const mediaId = uploadBody && typeof uploadBody.id === "string" ? uploadBody.id : null;
    if (!upload.ok || !mediaId) return { sent: false, reason: "media_upload_failed" };
    const caption = `Nueva donación registrada: ${nombre} · Código ${donation.codigo_identificacion} · Recepción ${donation.fecha_recepcion}`;
    const message = await fetchImpl(`${graph}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: { id: mediaId, caption },
      }),
    });
    if (message.ok) return { sent: true, via: "document" };
    // Fuera de la ventana de 24h solo se entregan plantillas aprobadas.
    const templateName = env("WHATSAPP_TEMPLATE_NAME");
    if (templateName) {
      const template = await fetchImpl(`${graph}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: env("WHATSAPP_TEMPLATE_LANG") || "es" },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: nombre },
                { type: "text", text: donation.dni_ce },
                { type: "text", text: donation.codigo_identificacion },
                { type: "text", text: donation.fecha_recepcion },
                { type: "text", text: origin ? `${origin}/admin` : "" },
              ],
            }],
          },
        }),
      });
      if (template.ok) return { sent: true, via: "template" };
    }
    return { sent: false, reason: "send_failed" };
  } catch {
    return { sent: false, reason: "network_error" };
  }
}

function excelStatusAfter(send, current = null) {
  if (send.sent) return send.via === "template" ? "notificado" : "enviado";
  return send.reason === "service_not_configured" ? current || "pendiente" : "fallido";
}

// ---------- Acciones ----------

const DUPLICATE_MESSAGE = "Ese código de identificación de la tableta ya fue registrado";

async function registroAction({ request, supabase, env, origin, cryptoHelper }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_input", message: "Datos inválidos" }, 400);
  }
  const validated = validateDonacion(input);
  if (!validated.ok) {
    return json({ ok: false, error: "invalid_input", field: validated.field, message: validated.message }, 400);
  }
  const donation = validated.data;
  let encrypted;
  try {
    encrypted = await cryptoHelper.encrypt(donation);
  } catch {
    return json({ error: "service_not_configured" }, 503);
  }
  const duplicate = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("codigo_identificacion", donation.codigo_identificacion)
    .limit(1);
  if (duplicate.error) return json({ error: "database_request_failed" }, 503);
  if ((duplicate.count ?? 0) > 0) {
    return json({ ok: false, error: "duplicate_code", duplicate: true, field: "codigo_identificacion", message: DUPLICATE_MESSAGE }, 409);
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const inserted = await supabase
    .from(TABLE)
    .insert({ id, data: encrypted, codigo_identificacion: donation.codigo_identificacion, created_at: createdAt, excel_status: "pendiente" })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return json({ ok: false, error: "duplicate_code", duplicate: true, field: "codigo_identificacion", message: DUPLICATE_MESSAGE }, 409);
    }
    return json({ error: "database_request_failed" }, 503);
  }
  // El registro ya está guardado; si WhatsApp falla, el admin puede reenviarlo.
  const send = await sendDonationExcel({ env, donation, origin });
  const excelStatus = excelStatusAfter(send, "pendiente");
  await supabase
    .from(TABLE)
    .update({ excel_status: excelStatus, excel_error: send.sent ? null : send.reason })
    .eq("id", id);
  return json({ ok: true, id, excel_status: excelStatus, whatsapp_sent: send.sent });
}

async function listAction({ supabase, cryptoHelper }) {
  const query = await supabase
    .from(TABLE)
    .select("id,data,codigo_identificacion,created_at,excel_status,excel_error")
    .order("created_at", { ascending: false })
    .limit(500);
  if (query.error || !Array.isArray(query.data)) return json({ error: "database_request_failed" }, 503);
  const items = [];
  for (const row of query.data) {
    let donation = null;
    try {
      donation = await cryptoHelper.decrypt(row.data);
    } catch {
      donation = null;
    }
    items.push({
      id: row.id,
      created_at: row.created_at,
      codigo_identificacion: row.codigo_identificacion,
      excel_status: row.excel_status || "pendiente",
      excel_error: row.excel_error || null,
      donation,
    });
  }
  return json({ ok: true, items });
}

async function excelAction({ supabase, cryptoHelper }) {
  const query = await supabase
    .from(TABLE)
    .select("data,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (query.error || !Array.isArray(query.data)) return json({ error: "database_request_failed" }, 503);
  const rows = [[...EXCEL_HEADERS, "Fecha de registro"]];
  for (const row of query.data) {
    let donation = null;
    try {
      donation = await cryptoHelper.decrypt(row.data);
    } catch {
      donation = null;
    }
    if (!donation) continue;
    rows.push([...donationRow(donation), String(row.created_at ?? "")]);
  }
  const today = new Date().toISOString().slice(0, 10);
  return new Response(buildXlsxBlob(rows), {
    headers: {
      "content-type": XLSX_MIME,
      "content-disposition": `attachment; filename="donaciones-${today}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}

async function resendAction({ request, supabase, env, origin, cryptoHelper }) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const id = body && typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id) return json({ ok: false, error: "invalid_input", message: "Falta el identificador del registro" }, 400);
  const query = await supabase
    .from(TABLE)
    .select("id,data,codigo_identificacion,created_at,excel_status")
    .eq("id", id)
    .limit(1);
  if (query.error || !Array.isArray(query.data)) return json({ error: "database_request_failed" }, 503);
  const row = query.data[0];
  if (!row) return json({ ok: false, error: "not_found" }, 404);
  let donation;
  try {
    donation = await cryptoHelper.decrypt(row.data);
  } catch {
    return json({ ok: false, error: "decrypt_failed" }, 500);
  }
  const send = await sendDonationExcel({ env, donation, origin });
  const excelStatus = excelStatusAfter(send, row.excel_status);
  await supabase
    .from(TABLE)
    .update({ excel_status: excelStatus, excel_error: send.sent ? null : send.reason })
    .eq("id", id);
  return json({ ok: true, excel_status: excelStatus, whatsapp_sent: send.sent, reason: send.sent ? null : send.reason });
}

// ---------- Enrutador con token de administración ----------

async function verifyAdmin(request, env) {
  const expected = env("ADMIN_PASSWORD");
  if (!expected) return json({ error: "service_not_configured" }, 503);
  const provided = request.headers.get("x-admin-token") ?? "";
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", TEXT.encode(provided)),
    crypto.subtle.digest("SHA-256", TEXT.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let same = left.length === right.length;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) same = false;
  }
  if (!same) return json({ ok: false, error: "unauthorized", message: "Contraseña incorrecta" }, 401);
  return null;
}

export function createSiteHandler(env = (name) => globalThis.Deno?.env?.get(name)) {
  const cryptoHelper = createCrypto(env);
  return async function handler({ request, supabase }) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "";
    const method = request.method;
    const origin = url.origin;
    try {
      if (method === "POST" && action === "registro") {
        return await registroAction({ request, supabase, env, origin, cryptoHelper });
      }
      if (action === "list" || action === "excel" || action === "resend") {
        const denied = await verifyAdmin(request, env);
        if (denied) return denied;
        if (method === "GET" && action === "list") return await listAction({ supabase, cryptoHelper });
        if (method === "GET" && action === "excel") return await excelAction({ supabase, cryptoHelper });
        if (method === "POST" && action === "resend") {
          return await resendAction({ request, supabase, env, origin, cryptoHelper });
        }
        return json({ error: "method_not_allowed" }, 405, { allow: action === "resend" ? "POST" : "GET" });
      }
      return json({ error: "not_found" }, 404);
    } catch {
      return json({ error: "internal_error" }, 500);
    }
  };
}

export {
  validateDonacion,
  buildXlsxBlob,
  donationRow,
  EXCEL_HEADERS,
  sendDonationExcel,
  createCrypto,
  excelStatusAfter,
};
