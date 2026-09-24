import JSZip from "jszip";

export async function fetchBlob(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo descargar el documento");
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export async function downloadUrl(url: string, filename: string) {
  saveBlob(await fetchBlob(url), filename);
}

export async function downloadZip(files: { url: string; name: string }[], zipName: string) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, await fetchBlob(f.url));
  saveBlob(await zip.generateAsync({ type: "blob" }), zipName);
}

export async function printPdf(url: string) {
  const blob = await fetchBlob(url);
  const href = URL.createObjectURL(blob);
  const w = window.open(href, "_blank");
  if (w) w.addEventListener("load", () => w.print());
}

export const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40);
