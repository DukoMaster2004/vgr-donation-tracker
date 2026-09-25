import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
}

function classifyEvent(payload: unknown): string {
  const p = payload as { entry?: { changes?: { value?: { statuses?: unknown; messages?: unknown } }[] }[] };
  const value = p?.entry?.[0]?.changes?.[0]?.value;
  if (value?.statuses) return "whatsapp.status";
  if (value?.messages) return "whatsapp.message";
  return "whatsapp.unknown";
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      // Meta's one-time subscription handshake: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
      GET: async ({ request }) => {
        const verifyToken = process.env["WHATSAPP_VERIFY_TOKEN"];
        if (!verifyToken) return new Response("Not configured", { status: 503 });
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && token === verifyToken && challenge) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const appSecret = process.env["WHATSAPP_APP_SECRET"];
        if (!appSecret) return new Response("Not configured", { status: 503 });
        const rawBody = await request.text();
        if (!verifySignature(rawBody, request.headers.get("X-Hub-Signature-256"), appSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }
        let payload: unknown;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }
        const deliveryId = createHash("sha256").update(rawBody).digest("hex");
        const event = classifyEvent(payload);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyStatuses, processPending } = await import("@/lib/whatsapp-status.server");

        const ins = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .upsert({ delivery_id: deliveryId, event, payload: payload as never }, { onConflict: "delivery_id", ignoreDuplicates: true });
        if (ins.error) return new Response("Storage error", { status: 500 });
        const { data: row, error } = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .select("id, processed_at")
          .eq("delivery_id", deliveryId)
          .single();
        if (error || !row) return new Response("Storage error", { status: 500 });

        if (!row.processed_at) {
          try {
            // Unknown event types are stored and acknowledged. Unmatched statuses stay pending
            // and are applied when the outbound id is saved or by processPending.
            const done = event === "whatsapp.status" ? await applyStatuses(supabaseAdmin, payload) : true;
            if (done) {
              const u = await supabaseAdmin.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", row.id);
              if (u.error) return new Response("Storage error", { status: 500 });
            }
          } catch (e) {
            await supabaseAdmin.from("whatsapp_webhook_events").update({ processing_error: String(e) }).eq("id", row.id);
            return new Response("Processing error", { status: 500 });
          }
        }
        await processPending(supabaseAdmin, row.id).catch(() => undefined);
        return new Response("ok");
      },
    },
  },
});
