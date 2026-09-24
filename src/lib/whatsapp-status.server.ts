type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

type Status = { id: string; status: string; timestamp?: string; errors?: { title?: string; message?: string }[] };

function statusesOf(payload: unknown): Status[] {
  const p = payload as { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] };
  return p?.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
}

/** Applies status callbacks. Returns true when every status matched a stored outbound message. */
export async function applyStatuses(admin: Admin, payload: unknown): Promise<boolean> {
  let allMatched = true;
  for (const s of statusesOf(payload)) {
    const { data, error } = await admin
      .from("donaciones")
      .select("id, whatsapp_status")
      .eq("whatsapp_message_id", s.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      allMatched = false;
      continue;
    }
    const cur = RANK[data.whatsapp_status ?? "accepted"] ?? 0;
    const next = RANK[s.status] ?? 0;
    if (next < cur) continue; // older callback must not overwrite a newer state
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null;
    const errText = s.errors?.map((e) => e.message || e.title).join("; ") || null;
    const upd = await admin
      .from("donaciones")
      .update({ whatsapp_status: s.status, whatsapp_status_at: at, ...(errText ? { whatsapp_error: errText } : {}) })
      .eq("id", data.id);
    if (upd.error) throw new Error(upd.error.message);
  }
  return allMatched;
}

/** Called right after we store an outbound id, to apply callbacks that arrived first. */
export async function reconcileStatusesFor(admin: Admin, messageId: string) {
  const { data } = await admin
    .from("whatsapp_webhook_events")
    .select("id, payload")
    .eq("event", "whatsapp.status")
    .is("processed_at", null)
    .limit(50);
  for (const row of data ?? []) {
    if (!JSON.stringify(row.payload).includes(messageId)) continue;
    const ok = await applyStatuses(admin, row.payload);
    if (ok) await admin.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", row.id);
  }
}

/** Bounded recovery of pending events on each new webhook call (fair: oldest-first, small batch, skips just-failed). */
export async function processPending(admin: Admin, excludeId?: string) {
  const { data } = await admin
    .from("whatsapp_webhook_events")
    .select("id, event, payload, received_at")
    .is("processed_at", null)
    .lt("received_at", new Date(Date.now() - 30_000).toISOString())
    .order("received_at", { ascending: true })
    .limit(10);
  for (const row of data ?? []) {
    if (row.id === excludeId) continue;
    try {
      const done = row.event === "whatsapp.status" ? await applyStatuses(admin, row.payload) : true;
      // Give up on unmatched statuses after 7 days so they don't block the queue forever.
      const old = Date.now() - new Date(row.received_at).getTime() > 7 * 86400_000;
      if (done || old) await admin.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: done ? null : "sin mensaje coincidente" }).eq("id", row.id);
    } catch (e) {
      await admin.from("whatsapp_webhook_events").update({ processing_error: String(e) }).eq("id", row.id);
    }
  }
}
