import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WHATSAPP_API_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });
        let payload: unknown;
        try {
          const verified = await verifyWebhookRequest({ req: request, secret, maxBodyBytes: 4 * 1024 * 1024 });
          payload = verified.payload;
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }
        const deliveryId = request.headers.get("X-Lovable-Delivery") ?? "";
        const event = request.headers.get("X-Lovable-Event") ?? "";
        if (!deliveryId || !event) return new Response("Missing headers", { status: 400 });

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
