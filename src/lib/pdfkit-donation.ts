import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

export type DonationPdfOptions = {
  donorName?: string;
  fileName?: string;
  outputDir?: string;
  title?: string;
  amount?: string;
};

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function findFingerprintAsset() {
  const candidates = [
    path.resolve(process.cwd(), "public/assets/fingerprint-profesional.png"),
    path.resolve(process.cwd(), "assets/fingerprint-profesional.png"),
    path.resolve(process.cwd(), "src/assets/fingerprint-profesional.png"),
    path.resolve(process.cwd(), "public/fingerprint-profesional.png"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export async function createDonationPdf({
  donorName = "Donante",
  fileName,
  outputDir = path.resolve(process.cwd(), "generated"),
  title = "Comprobante de Donación",
  amount = "0.00",
}: DonationPdfOptions = {}): Promise<string> {
  let pdfPath = "";

  try {
    const fingerprintAsset = findFingerprintAsset();
    if (!fingerprintAsset) {
      throw new Error("No se encontró la imagen /assets/fingerprint-profesional.png");
    }

    const resolvedDir = path.resolve(outputDir);
    mkdirSync(resolvedDir, { recursive: true });

    const rawBaseName = fileName ? fileName.replace(/\.pdf$/i, "") : donorName ?? "comprobante";
    const safeBaseName = sanitizeFilename(rawBaseName || "comprobante");
    const finalName = `${safeBaseName}.pdf`;
    pdfPath = path.join(resolvedDir, finalName);

    const { default: PDFDocument } = await import("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const stream = createWriteStream(pdfPath);

    doc.pipe(stream);
    doc.fontSize(22).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Donante: ${donorName}`);
    doc.text(`Monto: S/ ${amount}`);
    doc.text("Comprobante válido para registro de donación.");
    doc.moveDown(2);

    doc.image(fingerprintAsset, 420, 100, { fit: [120, 160] });
    doc.fontSize(11).text("Firma Digital Autenticada", 420, 270, { width: 120, align: "center" });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", (error) => reject(error));
    });

    return finalName;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo generar el PDF de donación: ${message}`);
  }
}
