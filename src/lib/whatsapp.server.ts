import { fechaLarga } from "./donacion-schema";
import { buildAdminImage } from "./donacion-image.server";
import type { DonacionRow } from "./pdf.server";

const GRAPH_API_VERSION = "v21.0";
const DEFAULT_ADMIN_NUMBER = "51951012633";

export function buildAdminMessage(
  d: DonacionRow,
  links?: { formulario?: string; declaracion?: string },
) {
  const dir = [d.direccion, d.direccion_linea_2].filter(Boolean).join(", ");
  let msg = `NUEVO REGISTRO DE RECEPCIÓN DE DONACIÓN

Nombre:
${d.nombre_completo}

DNI/CE:
${d.dni_ce}

Iglesia:
${d.iglesia || "-"}

Pastor:
${d.nombre_pastor}

Dirección:
${dir}

Distrito:
${d.distrito}

Provincia:
${d.provincia}

Departamento:
${d.departamento}

Ciudad:
${d.ciudad}

País:
${d.pais}

Teléfono:
${d.telefono}

Email:
${d.email}

Código de tableta:
${d.codigo_identificacion}

Fecha de recepción:
${fechaLarga(d.fecha_recepcion).texto}

Se ha registrado una nueva recepción de donación.`;
  if (links?.formulario || links?.declaracion) {
    msg += `\n\nDocumentos (enlaces válidos por 7 días):`;
    if (links.formulario) msg += `\nFormulario: ${links.formulario}`;
    if (links.declaracion) msg += `\nDeclaración Jurada: ${links.declaracion}`;
  }
  return msg;
}

export type SendResult = { ok: true; messageId: string } | { ok: false; error: string };

async function uploadWhatsAppMedia(
  image: Buffer,
  phoneNumberId: string,
  apiKey: string,
): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "image/png");
  form.append("file", new Blob([new Uint8Array(image)], { type: "image/png" }), "donacion.png");
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    },
  );
  const text = await res.text();
  if (!res.ok)
    throw new Error(`No se pudo subir la imagen a WhatsApp [${res.status}]: ${text.slice(0, 500)}`);
  const json = JSON.parse(text) as { id?: string };
  if (!json.id) throw new Error("Respuesta de WhatsApp sin id de media");
  return json.id;
}

/**
 * Sends the admin notification. If WHATSAPP_TEMPLATE_NAME is set, sends an approved
 * template (needed for business-initiated messages outside the 24h window) with body params:
 * {{1}} nombre, {{2}} DNI/CE, {{3}} código tableta, {{4}} fecha, {{5}} enlace declaración.
 * Otherwise renders the record as an image and sends it with a short caption.
 */
export async function sendAdminWhatsApp(
  d: DonacionRow,
  links: { formulario?: string; declaracion?: string },
): Promise<SendResult> {
  const WHATSAPP_API_KEY = process.env["WHATSAPP_API_KEY"];
  const PHONE_NUMBER_ID = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const ADMIN = (process.env["WHATSAPP_ADMIN_NUMBER"] ?? DEFAULT_ADMIN_NUMBER).replace(/\D/g, "");
  if (!WHATSAPP_API_KEY || !PHONE_NUMBER_ID)
    return { ok: false, error: "WhatsApp no está conectado todavía." };
  if (!ADMIN) return { ok: false, error: "Falta configurar WHATSAPP_ADMIN_NUMBER." };

  const template = process.env["WHATSAPP_TEMPLATE_NAME"];
  const lang = process.env["WHATSAPP_TEMPLATE_LANG"] || "es";

  try {
    let body: Record<string, unknown>;
    if (template) {
      body = {
        messaging_product: "whatsapp",
        to: ADMIN,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [
                d.nombre_completo,
                d.dni_ce,
                d.codigo_identificacion,
                fechaLarga(d.fecha_recepcion).texto,
                links.declaracion ?? "-",
              ].map((text) => ({ type: "text", text })),
            },
          ],
        },
      };
    } else {
      const mediaId = await uploadWhatsAppMedia(
        buildAdminImage(d),
        PHONE_NUMBER_ID,
        WHATSAPP_API_KEY,
      );
      body = {
        messaging_product: "whatsapp",
        to: ADMIN,
        type: "image",
        image: { id: mediaId, caption: buildAdminMessage(d, links).slice(0, 1024) },
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      console.error(`WhatsApp send failed [${res.status}]: ${text}`);
      return { ok: false, error: `WhatsApp [${res.status}]: ${text.slice(0, 500)}` };
    }
    const json = JSON.parse(text) as { messages?: { id: string }[] };
    const id = json.messages?.[0]?.id;
    if (!id) return { ok: false, error: "Respuesta de WhatsApp sin id de mensaje" };
    return { ok: true, messageId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
