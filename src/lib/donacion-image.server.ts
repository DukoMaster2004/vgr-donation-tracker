import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { fechaLarga } from "./donacion-schema";
import { ARIMO_BOLD_B64, ARIMO_REGULAR_B64 } from "./arimo-fonts";
import { RESVG_WASM_B64 } from "./resvg-wasm";
import type { DonacionRow } from "./pdf.server";

const W = 900;
const ROW_H = 56;
const PAD = 32;
const HEADER_H = 110;

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function initResvg(): Promise<void> {
  try {
    // On Cloudflare Workers, Nitro/unwasm rewrites this import to the emitted .wasm asset,
    // which workerd compiles ahead of time to a WebAssembly.Module.
    const { default: wasm } = (await import("@resvg/resvg-wasm/index_bg.wasm?module")) as {
      default: WebAssembly.Module;
    };
    if (!(wasm instanceof WebAssembly.Module)) {
      throw new Error("resvg wasm import did not yield a WebAssembly.Module");
    }
    await initWasm(wasm);
  } catch {
    // Node (vite dev / prerender): the ?module import isn't a compiled module here, so
    // read the wasm bytes from node_modules instead.
    const { createRequire } = await import("node:module");
    const { readFile } = await import("node:fs/promises");
    const wasmPath = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
    await initWasm(new Uint8Array(await readFile(wasmPath)));
  }
}

await initResvg();

/** Renders the donation record as a PNG so it can be sent as a WhatsApp image message. */
export function buildAdminImage(d: DonacionRow): Buffer {
  const dir = [d.direccion, d.direccion_linea_2].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Nombre", d.nombre_completo],
    ["DNI/CE", d.dni_ce],
    ["Iglesia", d.iglesia || "-"],
    ["Pastor", d.nombre_pastor],
    ["Dirección", dir],
    ["Distrito", d.distrito],
    ["Provincia", d.provincia],
    ["Departamento", d.departamento],
    ["Ciudad", d.ciudad],
    ["País", d.pais],
    ["Teléfono", d.telefono],
    ["Email", d.email],
    ["Código de tableta", d.codigo_identificacion],
    ["Fecha de recepción", fechaLarga(d.fecha_recepcion).texto],
  ];
  const H = HEADER_H + rows.length * ROW_H + PAD;

  const body = rows
    .map(([label, value], i) => {
      const y = HEADER_H + i * ROW_H;
      const bg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
      return `
        <rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="${bg}" />
        <text x="${PAD}" y="${y + 22}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#64748b" font-weight="600">${esc(label.toUpperCase())}</text>
        <text x="${PAD}" y="${y + 42}" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#0f172a">${esc(value)}</text>
      `;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
      <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f172a" />
      <text x="${PAD}" y="46" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">NUEVO REGISTRO DE RECEPCIÓN DE DONACIÓN</text>
      <text x="${PAD}" y="78" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#94a3b8">TABLETA GRÁFICA</text>
      ${body}
    </svg>
  `;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: {
      // Workers has no system fonts; Arimo is metric-compatible with Arial/Helvetica
      // so the SVG's font-family list resolves to it without changing the layout.
      fontBuffers: [b64ToBytes(ARIMO_REGULAR_B64), b64ToBytes(ARIMO_BOLD_B64)],
      loadSystemFonts: false,
      defaultFontFamily: "Arimo",
      sansSerif: "Arimo",
      serif: "Arimo",
      cursive: "Arimo",
      fantasy: "Arimo",
      monospace: "Arimo",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
