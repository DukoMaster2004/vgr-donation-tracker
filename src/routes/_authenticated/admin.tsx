import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { VgrLogo } from "@/components/brand/VgrLogo";
import { DonacionForm, type FormValues } from "@/components/donacion/DonacionForm";
import { supabase } from "@/integrations/supabase/client";
import { ESTADOS, emptyDonacion, fieldLabels, fechaLarga } from "@/lib/donacion-schema";
import { actualizarDonacion, estadoAdmin, reclamarAdmin, reenviarWhatsApp } from "@/lib/donaciones.functions";
import { downloadUrl, downloadZip, slug } from "@/lib/downloads";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Panel administrativo — VGR" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Row = import("@/integrations/supabase/types").Database["public"]["Tables"]["donaciones"]["Row"];

function Admin() {
  const estado = useServerFn(estadoAdmin);
  const reclamar = useServerFn(reclamarAdmin);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const st = useQuery({ queryKey: ["estadoAdmin"], queryFn: () => estado() });
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const header = <SiteHeader right={<Button variant="ghost" onClick={signOut}>Cerrar sesión</Button>} />;
  if (st.isLoading) return <div className="min-h-screen">{header}<p className="p-8 text-center">Cargando...</p></div>;
  if (!st.data?.isAdmin)
    return (
      <div className="min-h-screen">
        {header}
        <div className="mx-auto max-w-md p-8 text-center">
          <VgrLogo size="sm" className="justify-center" />
          <p className="mt-6">Su cuenta no tiene acceso administrativo.</p>
          {!st.data?.adminExists && (
            <Button className="mt-4" onClick={async () => {
              const r = await reclamar();
              if (r.ok) { toast.success("Ahora es administrador."); st.refetch(); } else toast.error(r.error);
            }}>Activar mi cuenta como administrador</Button>
          )}
        </div>
      </div>
    );
  return <div className="min-h-screen">{header}<Dashboard /></div>;
}

function Dashboard() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [f, setF] = useState({ desde: "", hasta: "", departamento: "", ciudad: "", iglesia: "", estado: "" });
  const [sel, setSel] = useState<Row | null>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const list = useQuery({
    queryKey: ["donaciones", dq, f],
    queryFn: async () => {
      let b = supabase.from("donaciones").select("*").order("created_at", { ascending: false }).limit(500);
      if (dq.trim()) b = b.ilike("busqueda", `%${dq.trim().toLowerCase().replace(/[%_]/g, "")}%`);
      if (f.desde) b = b.gte("fecha_recepcion", f.desde);
      if (f.hasta) b = b.lte("fecha_recepcion", f.hasta);
      if (f.departamento) b = b.ilike("departamento", `%${f.departamento}%`);
      if (f.ciudad) b = b.ilike("ciudad", `%${f.ciudad}%`);
      if (f.iglesia) b = b.ilike("iglesia", `%${f.iglesia}%`);
      if (f.estado) b = b.eq("estado", f.estado as keyof typeof ESTADOS);
      const { data, error } = await b;
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await supabase.from("donaciones").select("estado, created_at, formulario_pdf_url");
      const rows = data ?? [];
      const m = new Date(); const ms = new Date(m.getFullYear(), m.getMonth(), 1).toISOString();
      return {
        total: rows.length,
        mes: rows.filter((r) => r.created_at >= ms).length,
        docs: rows.filter((r) => r.formulario_pdf_url).length,
        enviados: rows.filter((r) => r.estado === "enviado_whatsapp").length,
      };
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <VgrLogo size="sm" />
      <h1 className="mt-4 font-serif text-3xl font-semibold">Panel administrativo</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["Total de donaciones", stats.data?.total], ["Este mes", stats.data?.mes], ["Documentos generados", stats.data?.docs], ["Enviados por WhatsApp", stats.data?.enviados], ["Tabletas registradas", stats.data?.total]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{v ?? "—"}</p></div>
        ))}
      </div>
      <div className="mt-6 space-y-3 rounded-xl border bg-card p-4">
        <Input placeholder="Buscar por nombre, DNI/CE, código, iglesia, email, teléfono..." value={q} onChange={(e) => setQ(e.target.value)} className="h-11" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} aria-label="Desde" />
          <Input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} aria-label="Hasta" />
          <Input placeholder="Departamento" value={f.departamento} onChange={(e) => setF({ ...f, departamento: e.target.value })} />
          <Input placeholder="Ciudad" value={f.ciudad} onChange={(e) => setF({ ...f, ciudad: e.target.value })} />
          <Input placeholder="Iglesia" value={f.iglesia} onChange={(e) => setF({ ...f, iglesia: e.target.value })} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr>{["Nombre", "DNI/CE", "Iglesia", "Ciudad", "Departamento", "Código", "Recepción", "Teléfono", "Email", "Registro", "Estado"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {list.data?.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t hover:bg-accent/50" onClick={() => setSel(r)}>
                <td className="px-3 py-2 font-medium">{r.nombre_completo}</td><td className="px-3 py-2">{r.dni_ce}</td><td className="px-3 py-2">{r.iglesia}</td>
                <td className="px-3 py-2">{r.ciudad}</td><td className="px-3 py-2">{r.departamento}</td><td className="px-3 py-2">{r.codigo_identificacion}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.fecha_recepcion}</td><td className="px-3 py-2">{r.telefono}</td><td className="px-3 py-2">{r.email}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.created_at?.slice(0, 10)}</td><td className="px-3 py-2"><Badge variant="secondary">{ESTADOS[r.estado]}</Badge></td>
              </tr>
            ))}
            {list.data?.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
      {sel && <Detalle row={sel} onClose={() => { setSel(null); list.refetch(); stats.refetch(); }} />}
    </main>
  );
}

function Detalle({ row, onClose }: { row: Row; onClose: () => void }) {
  const reenviar = useServerFn(reenviarWhatsApp);
  const actualizar = useServerFn(actualizarDonacion);
  const [edit, setEdit] = useState(false);
  const [vals, setVals] = useState<FormValues>(() => Object.fromEntries(Object.keys(emptyDonacion).map((k) => [k, (row as unknown as Record<string, string | null>)[k] ?? ""])) as FormValues);
  const base = slug(row.nombre_completo ?? "registro");
  const sign = async () => {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrls([`${row.id}/formulario.pdf`, `${row.id}/declaracion-jurada.pdf`], 600);
    if (error || !data) throw new Error("Documentos no disponibles");
    return { f: data[0]?.signedUrl ?? "", d: data[1]?.signedUrl ?? "" };
  };
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{row.nombre_completo}</DialogTitle></DialogHeader>
        {edit ? (
          <>
            <DonacionForm values={vals} errors={{}} onChange={(k, v) => setVals({ ...vals, [k]: v })} />
            <div className="flex gap-2"><Button variant="outline" onClick={() => setEdit(false)}>Cancelar</Button>
              <Button onClick={() => act(async () => { const r = await actualizar({ data: { id: row.id, values: vals } }); if (!r.ok) throw new Error(r.error); toast.success("Registro actualizado y documentos regenerados"); onClose(); })}>Guardar</Button></div>
          </>
        ) : (
          <>
            <Badge className="w-fit">{ESTADOS[row.estado]}</Badge>
            {row.whatsapp_error && <p className="text-sm text-destructive">WhatsApp: {row.whatsapp_error}</p>}
            <dl className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(fieldLabels) as (keyof typeof fieldLabels)[]).map((k) => (
                <div key={k} className="border-b pb-1"><dt className="text-xs text-muted-foreground">{fieldLabels[k]}</dt><dd>{k === "fecha_recepcion" && (row as unknown as Record<string,string>)[k] ? fechaLarga(row[k] as string).texto : (row as unknown as Record<string,string>)[k] || "—"}</dd></div>
              ))}
            </dl>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={() => act(async () => downloadUrl((await sign()).f, `Formulario_${base}.pdf`))}>Descargar formulario</Button>
              <Button onClick={() => act(async () => downloadUrl((await sign()).d, `Declaracion_Jurada_${base}.pdf`))}>Descargar declaración jurada</Button>
              <Button onClick={() => act(async () => { const s = await sign(); await downloadZip([{ url: s.f, name: `Formulario_${base}.pdf` }, { url: s.d, name: `Declaracion_Jurada_${base}.pdf` }], `Documentos_${base}.zip`); })}>Descargar ambos</Button>
              <Button variant="secondary" onClick={() => act(async () => { const r = await reenviar({ data: { id: row.id } }); if (!r.ok) throw new Error(r.error); toast.success("Enviado por WhatsApp"); })}>Enviar nuevamente por WhatsApp</Button>
              <Button variant="outline" onClick={() => setEdit(true)}>Editar registro</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
