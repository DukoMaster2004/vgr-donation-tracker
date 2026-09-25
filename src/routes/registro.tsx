import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { VgrLogo } from "@/components/brand/VgrLogo";
import { DonacionForm, type FormErrors, type FormValues } from "@/components/donacion/DonacionForm";
import { donacionSchema, emptyDonacion, fieldLabels, fechaLarga } from "@/lib/donacion-schema";
import { registrarDonacion, type RegistroResult } from "@/lib/donaciones.functions";
import { downloadUrl, downloadZip, printPdf, slug } from "@/lib/downloads";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Registrar recepción — Voice of God Recordings" },
      {
        name: "description",
        content: "Formulario de registro de recepción de tableta gráfica y Declaración Jurada.",
      },
      { property: "og:title", content: "Registrar recepción — Voice of God Recordings" },
      {
        property: "og:description",
        content: "Formulario de registro de recepción de tableta gráfica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Registro,
});

const DRAFT_KEY = "vgr-registro-borrador";
type Step = "form" | "review" | "saving" | "done";
type Ok = Extract<RegistroResult, { ok: true }>;

function Registro() {
  const [values, setValues] = useState<FormValues>(emptyDonacion);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<Step>("form");
  const [phase, setPhase] = useState("Guardando información...");
  const [result, setResult] = useState<Ok | null>(null);
  const registrar = useServerFn(registrarDonacion);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setValues({ ...emptyDonacion, ...JSON.parse(d) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (step === "form") localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values, step]);

  const onChange = (k: keyof FormValues, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const review = () => {
    const r = donacionSchema.safeParse(values);
    if (!r.success) {
      const errs: FormErrors = {};
      for (const i of r.error.issues) {
        const k = i.path[0] as keyof FormValues;
        if (!errs[k]) errs[k] = i.message;
      }
      setErrors(errs);
      toast.error("Revise los campos marcados en rojo.");
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0 });
  };

  const confirm = async () => {
    setStep("saving");
    setPhase("Guardando información...");
    const t1 = setTimeout(() => setPhase("Generando documentos..."), 900);
    const t2 = setTimeout(() => setPhase("Enviando notificación..."), 2200);
    try {
      const res = await registrar({ data: values });
      clearTimeout(t1);
      clearTimeout(t2);
      if (!res.ok) {
        setStep("form");
        if (res.duplicate) setErrors({ codigo_identificacion: res.error });
        toast.error(res.error);
        return;
      }
      setPhase("Registro completado.");
      localStorage.removeItem(DRAFT_KEY);
      setResult(res);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (e) {
      clearTimeout(t1);
      clearTimeout(t2);
      setStep("review");
      toast.error(
        "No se pudo completar el registro. Sus datos se conservaron; intente nuevamente.",
      );
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 rounded-xl border bg-card p-6 text-center shadow-sm">
          <VgrLogo size="md" className="justify-center" />
          <p className="mt-3 text-muted-foreground">
            Formulario de registro de recepción de donación
          </p>
          {step === "form" && (
            <>
              <p className="mt-4 font-semibold uppercase tracking-wide">
                Por favor escribir con letra clara
              </p>
              <p className="text-sm text-muted-foreground">
                Todos los campos marcados (*) requieren de la información
              </p>
            </>
          )}
        </div>

        {step === "form" && (
          <>
            <DonacionForm values={values} errors={errors} onChange={onChange} />
            <p className="mt-6 text-sm text-muted-foreground">
              Toda la información en este formulario, incluyendo su dirección de email, será
              guardada de manera confidencial.
            </p>
            <Button size="lg" className="mt-6 h-12 w-full text-base" onClick={review}>
              Revisar información
            </Button>
          </>
        )}

        {step === "review" && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h1 className="font-serif text-3xl font-semibold">Revisión de información</h1>
            <p className="mt-1 text-muted-foreground">
              Verifique que todos los datos sean correctos.
            </p>
            <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {(Object.keys(fieldLabels) as (keyof FormValues)[]).map((k) => (
                <div key={k} className="border-b pb-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {fieldLabels[k]}
                  </dt>
                  <dd className="mt-0.5 break-words font-medium">
                    {k === "fecha_recepcion" && values[k]
                      ? fechaLarga(values[k]).texto
                      : values[k] || "—"}
                  </dd>
                </div>
              ))}
              <div className="border-b pb-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo de donación
                </dt>
                <dd className="mt-0.5 font-medium">TABLETA GRÁFICA</dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                className="h-12 flex-1"
                onClick={() => setStep("form")}
              >
                Editar información
              </Button>
              <Button size="lg" className="h-12 flex-1" onClick={confirm}>
                Confirmar y generar documentos
              </Button>
            </div>
          </section>
        )}

        {step === "saving" && (
          <section
            className="flex flex-col items-center rounded-xl border bg-card p-12 text-center shadow-sm"
            aria-live="polite"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">{phase}</p>
          </section>
        )}

        {step === "done" && result && <Success r={result} onFinish={() => navigate({ to: "/" })} />}
      </main>
    </div>
  );
}

function Success({ r, onFinish }: { r: Ok; onFinish: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const base = slug(r.nombre);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast.error("No se pudo descargar. Intente nuevamente.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="rounded-xl border bg-card p-6 text-center shadow-sm sm:p-10">
      <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
      <h1 className="mt-4 font-serif text-3xl font-semibold">Registro completado correctamente</h1>
      {r.links ? (
        <p className="mt-2 text-muted-foreground">Su Declaración Jurada ha sido generada.</p>
      ) : (
        <p className="mt-2 text-muted-foreground">
          Se envió la notificación por WhatsApp con la información registrada.
        </p>
      )}
      {r.links && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-12"
            disabled={!!busy}
            onClick={() =>
              run("d", () => downloadUrl(r.links!.declaracion, `Declaracion_Jurada_${base}.pdf`))
            }
          >
            {busy === "d" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Descargar
            Declaración Jurada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12"
            disabled={!!busy}
            onClick={() =>
              run("f", () => downloadUrl(r.links!.formulario, `Formulario_${base}.pdf`))
            }
          >
            Descargar formulario
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12"
            disabled={!!busy}
            onClick={() =>
              run("z", () =>
                downloadZip(
                  [
                    { url: r.links!.formulario, name: `Formulario_${base}.pdf` },
                    { url: r.links!.declaracion, name: `Declaracion_Jurada_${base}.pdf` },
                  ],
                  `Documentos_${base}.zip`,
                ),
              )
            }
          >
            Descargar ambos
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12"
            disabled={!!busy}
            onClick={() => run("p", () => printPdf(r.links!.declaracion))}
          >
            Imprimir documento
          </Button>
        </div>
      )}
      <Button size="lg" variant="outline" className="mt-6 h-12 w-full" onClick={onFinish}>
        Finalizar
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        ¿Necesita ayuda?{" "}
        <Link to="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </section>
  );
}
