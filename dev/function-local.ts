// Pruebas locales del flujo principal de la función edge, sin credenciales reales.
//   deno run dev/function-local.ts          -> ejecuta las verificaciones y termina
//   deno run --allow-net dev/function-local.ts serve -> sirve en 127.0.0.1:8000 (proxy de vite)

import {
  createSiteHandler,
  createCrypto,
  buildXlsxBlob,
  donationRow,
  EXCEL_HEADERS,
  sendDonationExcel,
  validateDonacion,
} from "../functions/handler.mjs";

const TEST_ENV: Record<string, string> = {
  ADMIN_PASSWORD: "clave-local-de-prueba",
};

const testEnv = (name: string): string | undefined => TEST_ENV[name];

const validDonation = {
  iglesia: "Iglesia Vida Nueva",
  nombre_pastor: "Pastor Juan Pérez",
  primer_nombre: "María",
  apellido_paterno: "Quispe",
  apellido_materno: "Rojas",
  dni_ce: "12345678",
  direccion: "Av. Los Héroes 123",
  direccion_linea_2: "Urbanización San Luis",
  ciudad: "Lima",
  estado_region: "Lima",
  codigo_postal: "15001",
  pais: "Perú",
  distrito: "San Luis",
  provincia: "Lima",
  departamento: "Lima",
  email: "maria@example.com",
  telefono: "+51 987 654 321",
  codigo_identificacion: "tab-2026-001",
  fecha_recepcion: "2026-09-24",
};

// ---------- base de datos falsa en memoria ----------

type Row = {
  id: string;
  data: string;
  codigo_identificacion: string;
  created_at: string;
  excel_status: string | null;
  excel_error: string | null;
};

function fakeSupabase() {
  const store: Row[] = [];
  const pick = (row: Row, cols: string) => {
    const out: Record<string, unknown> = {};
    for (const col of cols.split(",")) out[col] = (row as Record<string, unknown>)[col];
    return out;
  };
  const select = (cols: string, opts: { count?: string; head?: boolean } = {}) => {
    const state = { filters: [] as Array<[string, unknown]>, orderCol: null as string | null, asc: true, limit: 0, single: false };
    // deno-lint-ignore no-explicit-any
    const api: any = {
      eq(col: string, value: unknown) { state.filters.push([col, value]); return api; },
      order(col: string, o: { ascending?: boolean }) { state.orderCol = col; state.asc = o?.ascending !== false; return api; },
      limit(n: number) { state.limit = n; return api; },
      single() { state.single = true; return api; },
      // deno-lint-ignore no-explicit-any
      then(onOk: any, onErr: any) { return exec().then(onOk, onErr); },
    };
    const exec = async () => {
      let rows = store.filter((row) => state.filters.every(([col, value]) => (row as Record<string, unknown>)[col] === value));
      if (state.orderCol) {
        rows = [...rows].sort((a, b) => {
          const av = String((a as Record<string, unknown>)[state.orderCol!]);
          const bv = String((b as Record<string, unknown>)[state.orderCol!]);
          return state.asc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (state.limit) rows = rows.slice(0, state.limit);
      const count = opts.count === "exact" ? rows.length : null;
      const data = opts.head
        ? null
        : state.single
          ? (rows[0] ? pick(rows[0], cols) : null)
          : rows.map((row) => pick(row, cols));
      return { data, error: null, count };
    };
    return api;
  };
  const client = {
    from(_table: string) {
      return {
        select,
        insert(payload: Row) {
          let error: { code: string } | null = null;
          if (store.some((row) => row.codigo_identificacion === payload.codigo_identificacion)) {
            error = { code: "23505" };
          } else {
            store.push(payload);
          }
          // deno-lint-ignore no-explicit-any
          const api: any = {
            select(_cols: string) { return api; },
            single() { return api; },
            then(onOk: (v: { data: Row | null; error: { code: string } | null }) => void, onErr: unknown) {
              return Promise.resolve({ data: error ? null : payload, error }).then(onOk, onErr);
            },
          };
          return api;
        },
        update(patch: Partial<Row>) {
          const filters = [] as Array<[string, unknown]>;
          // deno-lint-ignore no-explicit-any
          const api: any = {
            eq(col: string, value: unknown) { filters.push([col, value]); return api; },
            // deno-lint-ignore no-explicit-any
            then(onOk: any, onErr: any) {
              const exec = async () => {
                for (const row of store) {
                  if (filters.every(([col, value]) => (row as Record<string, unknown>)[col] === value)) {
                    Object.assign(row, patch);
                  }
                }
                return { data: null, error: null };
              };
              return exec().then(onOk, onErr);
            },
          };
          return api;
        },
      };
    },
  };
  return { client, store };
}

// ---------- verificaciones ----------

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`[OK]    ${name}`);
  } else {
    failures += 1;
    console.error(`[FALLA] ${name}`, detail ?? "");
  }
}

function request(action: string, init: RequestInit = {}) {
  return new Request(`http://127.0.0.1:8000/functions/v1/app?action=${action}`, init);
}

async function runTests() {
  // 1. Validación de campos
  const valid = validateDonacion(validDonation);
  check("validación acepta datos completos", valid.ok === true && (valid as { data: Record<string, string> }).data?.codigo_identificacion === "TAB-2026-001", valid);
  const invalid = validateDonacion({ ...validDonation, dni_ce: "12" });
  check("validación rechaza DNI corto con campo", invalid.ok === false && (invalid as { field: string }).field === "dni_ce", invalid);
  const missing = validateDonacion({ ...validDonation, ciudad: "" });
  check("validación marca campo obligatorio", missing.ok === false && (missing as { field: string }).field === "ciudad", missing);

  // 2. Cifrado y descifrado
  const cryptoHelper = createCrypto(testEnv);
  const encrypted = await cryptoHelper.encrypt(validDonation);
  const decrypted = await cryptoHelper.decrypt(encrypted);
  check("cifrado reversible de datos", JSON.stringify(decrypted) === JSON.stringify(validDonation));

  // 3. Excel: estructura de archivo zip/xlsx
  const excelBlob = buildXlsxBlob([EXCEL_HEADERS, donationRow((valid as { data: Record<string, string> }).data)]);
  const excelBytes = new Uint8Array(await excelBlob.arrayBuffer());
  const magic = String.fromCharCode(...excelBytes.slice(0, 2));
  const tail = String.fromCharCode(...excelBytes.slice(-22, -20));
  const hasSheet = new TextDecoder().decode(excelBytes).includes("xl/worksheets/sheet1.xml");
  const hasValue = new TextDecoder().decode(excelBytes).includes("TABLETA GRÁFICA");
  check("xlsx inicia con firma PK", magic === "PK", magic);
  check("xlsx termina con EOCD", tail === "PK", tail);
  check("xlsx incluye hoja y tipo de donación", hasSheet && hasValue);
  await Deno.writeFile("/tmp/vgr-donacion-test.xlsx", excelBytes);

  // 4. Registro principal (sin credenciales de WhatsApp)
  const db = fakeSupabase();
  const handler = createSiteHandler(testEnv);
  const reg = await handler({
    request: request("registro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validDonation) }),
    supabase: db.client,
  });
  const regBody = await reg.json();
  check("registro responde 200 y guarda", reg.status === 200 && regBody.ok === true && db.store.length === 1, { status: reg.status, regBody });
  check("registro sin WhatsApp queda pendiente", regBody.whatsapp_sent === false && regBody.excel_status === "pendiente", regBody);

  // 5. Código duplicado
  const dup = await handler({
    request: request("registro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validDonation) }),
    supabase: db.client,
  });
  const dupBody = await dup.json();
  check("código duplicado responde 409", dup.status === 409 && dupBody.duplicate === true && dupBody.field === "codigo_identificacion", { status: dup.status, dupBody });

  // 6. Datos inválidos
  const bad = await handler({
    request: request("registro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...validDonation, email: "no-es-email" }) }),
    supabase: db.client,
  });
  const badBody = await bad.json();
  check("email inválido responde 400 con campo", bad.status === 400 && badBody.field === "email", { status: bad.status, badBody });

  // 7. Panel de administración
  const listNoToken = await handler({ request: request("list"), supabase: db.client });
  check("list sin token responde 401", listNoToken.status === 401, listNoToken.status);
  const listBadToken = await handler({
    request: request("list", { headers: { "x-admin-token": "incorrecta" } }),
    supabase: db.client,
  });
  check("list con token incorrecto responde 401", listBadToken.status === 401, listBadToken.status);
  const listOk = await handler({
    request: request("list", { headers: { "x-admin-token": TEST_ENV["ADMIN_PASSWORD"]! } }),
    supabase: db.client,
  });
  const listBody = await listOk.json();
  check(
    "list con token devuelve el registro descifrado",
    listOk.status === 200 && listBody.items.length === 1 && listBody.items[0].donation.email === "maria@example.com",
    listBody,
  );

  // 8. Excel de todos los registros
  const excelRes = await handler({
    request: request("excel", { headers: { "x-admin-token": TEST_ENV["ADMIN_PASSWORD"]! } }),
    supabase: db.client,
  });
  const excelAll = new Uint8Array(await excelRes.arrayBuffer());
  check(
    "excel admin responde con archivo",
    excelRes.status === 200 && (excelRes.headers.get("content-type") ?? "").includes("spreadsheetml") && String.fromCharCode(...excelAll.slice(0, 2)) === "PK",
    { status: excelRes.status, type: excelRes.headers.get("content-type") },
  );

  // 9. Reenvío por WhatsApp (sin credenciales sigue pendiente)
  const resend = await handler({
    request: request("resend", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": TEST_ENV["ADMIN_PASSWORD"]! },
      body: JSON.stringify({ id: db.store[0].id }),
    }),
    supabase: db.client,
  });
  const resendBody = await resend.json();
  check("reenvío sin credenciales responde ok y pendiente", resend.status === 200 && resendBody.ok === true && resendBody.reason === "service_not_configured", resendBody);

  // 10. Panel sin contraseña configurada
  const unconfigured = createSiteHandler(() => undefined);
  const unres = await unconfigured({ request: request("list"), supabase: db.client });
  check("list sin ADMIN_PASSWORD responde 503", unres.status === 503 && (await unres.json()).error === "service_not_configured", unres.status);

  // 11. Errores de ruta
  const notFound = await handler({ request: request("otra"), supabase: db.client });
  check("acción desconocida responde 404", notFound.status === 404, notFound.status);
  const wrongMethod = await handler({
    request: request("list", { method: "POST", headers: { "x-admin-token": TEST_ENV["ADMIN_PASSWORD"]! } }),
    supabase: db.client,
  });
  check("método incorrecto responde 405", wrongMethod.status === 405, wrongMethod.status);

  // 12. WhatsApp con transporte falso: documento directo
  // deno-lint-ignore no-explicit-any
  const calls: Array<{ url: string; body: any }> = [];
  const fakeFetch = async (url: string | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), body });
    if (String(url).endsWith("/media")) return new Response(JSON.stringify({ id: "media-123" }), { status: 200 });
    return new Response(JSON.stringify({ message_id: "m-1" }), { status: 200 });
  };
  const waEnv = (name: string) =>
    ({
      ADMIN_PASSWORD: TEST_ENV["ADMIN_PASSWORD"],
      WHATSAPP_API_KEY: "EAAG-clave-falsa",
      WHATSAPP_PHONE_NUMBER_ID: "109876543210",
      WHATSAPP_ADMIN_NUMBER: "+51 951 012 633",
      WHATSAPP_TEMPLATE_NAME: "donacion_registrada",
      WHATSAPP_TEMPLATE_LANG: "es",
    })[name];
  const sendDoc = await sendDonationExcel({
    env: waEnv,
    fetchImpl: fakeFetch as unknown as typeof fetch,
    donation: (valid as { data: Record<string, string> }).data,
    origin: "https://vgr.example",
  });
  const docCall = calls.find((call) => call.url.endsWith("/messages") && call.body?.type === "document");
  check("whatsapp envía documento", sendDoc.sent === true && sendDoc.via === "document", sendDoc);
  check("whatsapp normaliza el número destino", docCall?.body?.to === "51951012633", docCall?.body?.to);
  check("whatsapp usa el medio subido", docCall?.body?.document?.id === "media-123", docCall?.body?.document);
  check("whatsapp incluye código en el texto", String(docCall?.body?.document?.caption ?? "").includes("TAB-2026-001"), docCall?.body?.document?.caption);

  // 13. WhatsApp: respaldo con plantilla cuando el documento no se entrega
  calls.length = 0;
  const fetchDocFailsTplOk = async (url: string | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), body });
    if (String(url).endsWith("/media")) return new Response(JSON.stringify({ id: "media-456" }), { status: 200 });
    if (body?.type === "document") return new Response(JSON.stringify({ error: { code: 131047 } }), { status: 400 });
    return new Response(JSON.stringify({ message_id: "m-2" }), { status: 200 });
  };
  const sendTpl = await sendDonationExcel({
    env: waEnv,
    fetchImpl: fetchDocFailsTplOk as unknown as typeof fetch,
    donation: (valid as { data: Record<string, string> }).data,
    origin: "https://vgr.example",
  });
  const tplCall = calls.find((call) => call.body?.type === "template");
  const params = tplCall?.body?.template?.components?.[0]?.parameters ?? [];
  check("whatsapp respalda con plantilla", sendTpl.sent === true && sendTpl.via === "template", sendTpl);
  check("plantilla lleva los 5 parámetros", params.length === 5 && params[2]?.text === "TAB-2026-001", params);

  // 14. WhatsApp: error de red
  const sendFail = await sendDonationExcel({
    env: waEnv,
    // deno-lint-ignore no-explicit-any
    fetchImpl: (async () => { throw new Error("sin red"); }) as unknown as typeof fetch,
    donation: (valid as { data: Record<string, string> }).data,
  });
  check("whatsapp reporta error de red sin lanzar", sendFail.sent === false && sendFail.reason === "network_error", sendFail);

  console.log(failures === 0 ? "\nTodas las verificaciones pasaron." : `\n${failures} verificación(es) fallaron.`);
  if (failures > 0) Deno.exit(1);
}

async function runServe() {
  const db = fakeSupabase();
  const handler = createSiteHandler(testEnv);
  Deno.serve({ port: 8000, hostname: "127.0.0.1" }, (req) => handler({ request: req, supabase: db.client }));
}

if (Deno.args[0] === "serve") {
  await runServe();
} else {
  await runTests();
}
