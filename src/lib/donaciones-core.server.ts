import { buildDeclaracionPdf, buildFormularioPdf, type DonacionRow } from "./pdf.server";
import { sendAdminWhatsApp } from "./whatsapp.server";
import { reconcileStatusesFor } from "./whatsapp-status.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const BUCKET = "documentos";
const WEEK = 60 * 60 * 24 * 7;

export async function generateAndStoreDocs(admin: Admin, id: string, d: DonacionRow) {
  const [form, decl] = await Promise.all([buildFormularioPdf(d), buildDeclaracionPdf(d)]);
  const formPath = `${id}/formulario.pdf`;
  const declPath = `${id}/declaracion-jurada.pdf`;
  const up1 = await admin.storage.from(BUCKET).upload(formPath, form, { contentType: "application/pdf", upsert: true });
  if (up1.error) throw new Error(`No se pudo guardar el formulario: ${up1.error.message}`);
  const up2 = await admin.storage.from(BUCKET).upload(declPath, decl, { contentType: "application/pdf", upsert: true });
  if (up2.error) throw new Error(`No se pudo guardar la declaración: ${up2.error.message}`);
  const { error } = await admin
    .from("donaciones")
    .update({ formulario_pdf_url: formPath, declaracion_pdf_url: declPath, estado: "documentos_generados" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { formPath, declPath };
}

export async function signedUrls(admin: Admin, paths: { formPath: string; declPath: string }, expires = 60 * 60) {
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrls([paths.formPath, paths.declPath], expires);
  if (error || !data) throw new Error(error?.message ?? "No se pudieron crear enlaces");
  return { formulario: data[0]?.signedUrl ?? "", declaracion: data[1]?.signedUrl ?? "" };
}

export async function notifyWhatsApp(admin: Admin, id: string, d: DonacionRow, paths: { formPath: string; declPath: string }) {
  const links = await signedUrls(admin, paths, WEEK);
  const res = await sendAdminWhatsApp(d, links);
  if (res.ok) {
    await admin
      .from("donaciones")
      .update({ estado: "enviado_whatsapp", whatsapp_message_id: res.messageId, whatsapp_status: "accepted", whatsapp_error: null })
      .eq("id", id);
    await reconcileStatusesFor(admin, res.messageId);
  } else {
    await admin.from("donaciones").update({ whatsapp_status: "failed", whatsapp_error: res.error }).eq("id", id);
  }
  return res;
}
