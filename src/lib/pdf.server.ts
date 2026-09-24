import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fechaLarga } from "./donacion-schema";

export type DonacionRow = {
  iglesia: string | null;
  nombre_pastor: string;
  primer_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  dni_ce: string;
  direccion: string;
  direccion_linea_2: string | null;
  ciudad: string;
  estado_region: string;
  codigo_postal: string;
  pais: string;
  distrito: string;
  provincia: string;
  departamento: string;
  email: string;
  telefono: string;
  codigo_identificacion: string;
  fecha_recepcion: string;
};

// A4 in points
const W = 595.28;
const H = 841.89;
const BLACK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.35, 0.35, 0.38);

// Institutional data — copied from the reference document. Do not change without the owner's request.
export const ORG = {
  nombre: "Asociación Grabaciones La Voz de Dios",
  ruc: "205060079170",
  representante: "Sr. Roger Alfredo Rojas Flores",
  direccionPie:
    "Av. Fray Bartolomé Las Casas Nro. 464 Urb. Los Jardines 2da Etapa en San Martín de Porres, Provincia y Departamento de Lima",
};

type Seg = { t: string; bold?: boolean; underline?: boolean };

function wrapSegments(segs: Seg[], fonts: { r: PDFFont; b: PDFFont }, size: number, maxW: number) {
  const words: Seg[] = [];
  for (const s of segs) {
    for (const [i, w] of s.t.split(/(\s+)/).entries()) {
      if (w === "") continue;
      words.push({ ...s, t: w });
      void i;
    }
  }
  const lines: Seg[][] = [];
  let line: Seg[] = [];
  let lw = 0;
  for (const w of words) {
    const f = w.bold ? fonts.b : fonts.r;
    const ww = f.widthOfTextAtSize(w.t, size);
    if (/^\s+$/.test(w.t)) {
      if (line.length) {
        line.push(w);
        lw += ww;
      }
      continue;
    }
    if (lw + ww > maxW && line.length) {
      while (line.length && /^\s+$/.test(line[line.length - 1].t)) line.pop();
      lines.push(line);
      line = [];
      lw = 0;
    }
    line.push(w);
    lw += ww;
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  segs: Seg[],
  fonts: { r: PDFFont; b: PDFFont },
  x: number,
  y: number,
  maxW: number,
  size: number,
  lh: number,
) {
  const lines = wrapSegments(segs, fonts, size, maxW);
  lines.forEach((ln, idx) => {
    const isLast = idx === lines.length - 1;
    const tokens = ln;
    const wordW = tokens
      .filter((t) => !/^\s+$/.test(t.t))
      .reduce((a, t) => a + (t.bold ? fonts.b : fonts.r).widthOfTextAtSize(t.t, size), 0);
    const gaps = tokens.filter((t) => /^\s+$/.test(t.t)).length;
    const spaceW = fonts.r.widthOfTextAtSize(" ", size);
    const gap = !isLast && gaps > 0 ? (maxW - wordW) / gaps : spaceW;
    let cx = x;
    for (const t of tokens) {
      if (/^\s+$/.test(t.t)) {
        cx += gap;
        continue;
      }
      const f = t.bold ? fonts.b : fonts.r;
      const tw = f.widthOfTextAtSize(t.t, size);
      page.drawText(t.t, { x: cx, y, size, font: f, color: BLACK });
      if (t.underline) page.drawLine({ start: { x: cx, y: y - 2 }, end: { x: cx + tw, y: y - 2 }, thickness: 0.8, color: BLACK });
      cx += tw;
    }
    y -= lh;
  });
  return y;
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, underline = false) {
  const w = font.widthOfTextAtSize(text, size);
  const x = (W - w) / 2;
  page.drawText(text, { x, y, size, font, color: BLACK });
  if (underline) page.drawLine({ start: { x, y: y - 3 }, end: { x: x + w, y: y - 3 }, thickness: 1.2, color: BLACK });
}

function wrapPlain(text: string, font: PDFFont, size: number, maxW: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

export async function buildDeclaracionPdf(d: DonacionRow): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Declaración Jurada - ${d.nombre_completo}`);
  pdf.setAuthor("Voice of God Recordings");
  const page = pdf.addPage([W, H]);
  const r = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bi = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const fonts = { r, b };

  page.drawText("Voice of God Recordings", { x: 60, y: H - 70, size: 11, font: bi, color: GREY });
  page.drawText("ORIGINAL", { x: W - 60 - b.widthOfTextAtSize("ORIGINAL", 11), y: H - 70, size: 11, font: b, color: BLACK });

  centered(page, "DECLARACIÓN JURADA DE RECEPCIÓN DE", b, 16, H - 130, true);
  centered(page, "DONACIÓN", b, 16, H - 152, true);

  const x = 70;
  const maxW = W - 140;
  const size = 11.5;
  const lh = 22;
  const domicilio = [d.direccion, d.direccion_linea_2].filter(Boolean).join(", ");
  let y = H - 210;
  y = drawParagraph(
    page,
    [
      { t: "Yo, " },
      { t: d.nombre_completo, bold: true },
      { t: ", identificado (a) con DNI/CE N° " },
      { t: d.dni_ce, bold: true },
      { t: ", con domicilio en " },
      { t: domicilio, bold: true },
      { t: " distrito de " },
      { t: d.distrito, bold: true },
      { t: ", en la provincia de " },
      { t: d.provincia, bold: true },
      { t: ", Departamento de " },
      { t: d.departamento, bold: true },
      { t: "." },
    ],
    fonts, x, y, maxW, size, lh,
  );

  const f = fechaLarga(d.fecha_recepcion);
  y -= 18;
  y = drawParagraph(
    page,
    [
      { t: "Declaro que el día de hoy " },
      { t: f.dia, bold: true },
      { t: " de " },
      { t: f.mes, bold: true },
      { t: ` de ${f.anio}, he recibido en calidad de ` },
      { t: "donación y sin costo alguno, la", bold: true },
      { t: " " },
      { t: "TABLETA GRAFICA", bold: true, underline: true },
      { t: ", con código de Identificación N° " },
      { t: d.codigo_identificacion, bold: true },
      { t: `, por parte de la ${ORG.nombre} identificada con RUC N° ${ORG.ruc}, debidamente representada por su Representante Legal el ${ORG.representante}; la cual recibí con el fin de la predicación del evangelio completo, ` },
      { t: "POR LO CUAL NO PODRÉ TRANSFERIR, VENDER, COMERCIALIZAR O DARLE CUALQUIER OTRO FIN QUE NO SEA EL ESTUDIO DE LA PALABRA DE DIOS.", bold: true },
    ],
    fonts, x, y, maxW, size, lh,
  );

  // Signature + fingerprint block
  const baseY = 230;
  page.drawLine({ start: { x, y: baseY + 60 }, end: { x: x + 220, y: baseY + 60 }, thickness: 0.8, color: BLACK });
  page.drawText("Firma", { x: x + 95, y: baseY + 46, size: 10, font: r, color: GREY });
  page.drawText("Nombre:", { x, y: baseY + 10, size: 12, font: b, color: BLACK });
  page.drawText(d.nombre_completo, { x: x + 58, y: baseY + 10, size: 11, font: r, color: BLACK, maxWidth: 260 });
  page.drawText("DNI/CE:", { x, y: baseY - 12, size: 12, font: b, color: BLACK });
  page.drawText(d.dni_ce, { x: x + 58, y: baseY - 12, size: 11, font: r, color: BLACK });

  const bx = W - 70 - 100;
  page.drawRectangle({ x: bx, y: baseY - 40, width: 100, height: 115, borderColor: BLACK, borderWidth: 1 });
  const hl = "HUELLA DIGITAL";
  page.drawText(hl, { x: bx + 50 - b.widthOfTextAtSize(hl, 10.5) / 2, y: baseY - 58, size: 10.5, font: b, color: BLACK });

  const foot = wrapPlain(ORG.direccionPie, r, 8.5, W - 160);
  foot.forEach((l, i) => {
    const w = r.widthOfTextAtSize(l, 8.5);
    page.drawText(l, { x: (W - w) / 2, y: 70 - i * 12, size: 8.5, font: r, color: GREY });
  });

  return pdf.save();
}

export async function buildFormularioPdf(d: DonacionRow): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Formulario de registro - ${d.nombre_completo}`);
  pdf.setAuthor("Voice of God Recordings");
  const page = pdf.addPage([W, H]);
  const r = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bi = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);

  centered(page, "Voice of God Recordings", bi, 22, H - 80);
  centered(page, "Formulario de registro de recepción de donación", r, 11, H - 102);
  page.drawText("POR FAVOR ESCRIBIR CON LETRA CLARA", { x: 55, y: H - 135, size: 11, font: b, color: BLACK });
  page.drawText("Todos los campos marcados (*) requieren de la información", { x: 55, y: H - 150, size: 10, font: r, color: BLACK });

  const rows: [string, string][] = [
    ["Iglesia", d.iglesia ?? ""],
    ["*Nombre del Pastor", d.nombre_pastor],
    ["*Primer Nombre", d.primer_nombre],
    ["*Apellido Paterno", d.apellido_paterno],
    ["*Apellido Materno", d.apellido_materno],
    ["*DNI / CE", d.dni_ce],
    ["*Dirección", d.direccion],
    ["", d.direccion_linea_2 ?? ""],
    ["*Ciudad", d.ciudad],
    ["*Distrito", d.distrito],
    ["*Provincia", d.provincia],
    ["*Departamento", d.departamento],
    ["*Estado / Región", d.estado_region],
    ["*Código Postal", d.codigo_postal],
    ["*País", d.pais],
    ["*Email", d.email],
    ["*Teléfono", d.telefono],
    ["*Tipo de donación", "TABLETA GRÁFICA"],
    ["*Código de tableta", d.codigo_identificacion],
    ["*Fecha de recepción", fechaLarga(d.fecha_recepcion).texto],
  ];
  let y = H - 190;
  const labelX = 55;
  const boxX = 185;
  const boxW = W - boxX - 55;
  for (const [label, value] of rows) {
    if (label) page.drawText(label, { x: labelX, y: y + 5, size: 10.5, font: r, color: BLACK });
    page.drawRectangle({ x: boxX, y: y - 2, width: boxW, height: 20, borderColor: BLACK, borderWidth: 0.8 });
    page.drawText(value, { x: boxX + 6, y: y + 4, size: 10.5, font: r, color: BLACK, maxWidth: boxW - 12 });
    y -= 29;
  }
  const note = wrapPlain(
    "Toda la información en este formulario, incluyendo su dirección de email, será guardada de manera confidencial",
    r, 10, W - 110,
  );
  y -= 10;
  for (const l of note) {
    page.drawText(l, { x: 55, y, size: 10, font: r, color: BLACK });
    y -= 14;
  }
  return pdf.save();
}
