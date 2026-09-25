import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { donacionSchema } from "./donacion-schema";

export type RegistroResult =
  | { ok: false; error: string; duplicate?: boolean }
  | {
      ok: true;
      id: string;
      nombre: string;
      links: { formulario: string; declaracion: string } | null;
      docsError: string | null;
      whatsapp: { ok: boolean; error?: string };
    };

export const registrarDonacion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => donacionSchema.parse(input))
  .handler(async ({ data }): Promise<RegistroResult> => {
    const { sendAdminWhatsApp } = await import("./whatsapp.server");

    const nombre_completo =
      `${data.primer_nombre} ${data.apellido_paterno} ${data.apellido_materno}`
        .replace(/\s+/g, " ")
        .trim();
    const row = {
      ...data,
      iglesia: data.iglesia || null,
      direccion_linea_2: data.direccion_linea_2 || null,
      nombre_completo,
      tipo_donacion: "TABLETA GRÁFICA",
      estado: "confirmado" as const,
    };
    const id = crypto.randomUUID();
    // Sent in the background so the registration always responds immediately,
    // regardless of how long WhatsApp/Meta takes or whether it fails.
    sendAdminWhatsApp(row, {}).catch((e) => console.error("WhatsApp send failed:", e));
    return {
      ok: true,
      id,
      nombre: nombre_completo,
      links: null,
      docsError: null,
      whatsapp: { ok: true },
    };
  });

async function assertAdmin(supabase: { rpc: (...a: never[]) => unknown }, userId: string) {
  const { data } = await (
    supabase as unknown as { rpc: (n: string, a: object) => Promise<{ data: boolean }> }
  ).rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!data) throw new Error("No autorizado");
}

/** First signed-in user becomes the admin, only while no admin exists. */
export const reclamarAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0)
      return {
        ok: false as const,
        error: "Ya existe un administrador. Pida acceso al administrador actual.",
      };
    const ins = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (ins.error) throw new Error(ins.error.message);
    return { ok: true as const };
  });

export const estadoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { isAdmin: !!isAdmin, adminExists: (count ?? 0) > 0 };
  });

const idInput = z.object({ id: z.string().uuid() });

async function loadRow(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("donaciones").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Registro no encontrado");
  return { supabaseAdmin, row: data };
}

export const reenviarWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin, row } = await loadRow(data.id);
    const core = await import("./donaciones-core.server");
    const paths =
      row.formulario_pdf_url && row.declaracion_pdf_url
        ? { formPath: row.formulario_pdf_url, declPath: row.declaracion_pdf_url }
        : await core.generateAndStoreDocs(supabaseAdmin, row.id, row);
    const res = await core.notifyWhatsApp(supabaseAdmin, row.id, row, paths);
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  });

export const regenerarDocumentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin, row } = await loadRow(data.id);
    const core = await import("./donaciones-core.server");
    await core.generateAndStoreDocs(supabaseAdmin, row.id, row);
    return { ok: true as const };
  });

export const actualizarDonacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), values: donacionSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const v = data.values;
    const nombre_completo = `${v.primer_nombre} ${v.apellido_paterno} ${v.apellido_materno}`
      .replace(/\s+/g, " ")
      .trim();
    const { error } = await context.supabase
      .from("donaciones")
      .update({
        ...v,
        iglesia: v.iglesia || null,
        direccion_linea_2: v.direccion_linea_2 || null,
        nombre_completo,
      })
      .eq("id", data.id);
    if (error) {
      if (error.code === "23505") {
        const { data: other } = await context.supabase
          .from("donaciones")
          .select("nombre_completo, dni_ce")
          .eq("codigo_identificacion", v.codigo_identificacion)
          .maybeSingle();
        return {
          ok: false as const,
          error: `Este código de identificación ya ha sido registrado${other ? ` (pertenece a ${other.nombre_completo}, DNI/CE ${other.dni_ce})` : ""}.`,
        };
      }
      return { ok: false as const, error: error.message };
    }
    const { supabaseAdmin, row } = await loadRow(data.id);
    const core = await import("./donaciones-core.server");
    await core.generateAndStoreDocs(supabaseAdmin, row.id, row);
    return { ok: true as const };
  });
