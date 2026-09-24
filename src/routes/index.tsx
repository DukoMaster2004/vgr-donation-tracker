import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Eye, FileSignature, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { VgrLogo } from "@/components/brand/VgrLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Registro de Recepción de Donación — Voice of God Recordings" },
      { name: "description", content: "Registre la recepción de su tableta gráfica y genere su Declaración Jurada de Recepción de Donación." },
      { property: "og:title", content: "Registro de Recepción de Donación — Voice of God Recordings" },
      { property: "og:description", content: "Registre la recepción de su tableta gráfica y genere su Declaración Jurada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const pasos = [
  { icon: ClipboardList, t: "Completar los datos" },
  { icon: Eye, t: "Revisar la información" },
  { icon: FileSignature, t: "Generar la Declaración Jurada" },
  { icon: CheckCircle2, t: "Confirmar la recepción" },
  { icon: Download, t: "Recibir los documentos" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b bg-gradient-to-b from-accent/60 to-background">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:py-24">
            <VgrLogo size="lg" className="flex-col gap-4 sm:flex-row" />
            <div className="mt-6 h-px w-24 bg-gold" />
            <h1 className="mt-6 font-serif text-4xl font-semibold sm:text-5xl">Registro de Recepción de Donación</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Complete el formulario para registrar la recepción de la donación y generar su Declaración Jurada de Recepción de Donación.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
              <Link to="/registro">Registrar recepción</Link>
            </Button>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center font-serif text-3xl font-semibold">¿Cómo funciona?</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {pasos.map((p, i) => (
              <li key={p.t} className="rounded-xl border bg-card p-5 text-center shadow-sm">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <p.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Paso {i + 1}</p>
                <p className="mt-1 font-medium">{p.t}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Toda la información registrada es guardada de manera confidencial.
      </footer>
    </div>
  );
}
