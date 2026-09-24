import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fieldLabels, type DonacionInput } from "@/lib/donacion-schema";

export type FormValues = Record<keyof DonacionInput, string>;
export type FormErrors = Partial<Record<keyof DonacionInput, string>>;

type K = keyof DonacionInput;
const sections: { title: string; letter: string; fields: { k: K; required?: boolean; type?: string; full?: boolean; placeholder?: string }[] }[] = [
  { letter: "A", title: "Datos de la Iglesia", fields: [{ k: "iglesia" }, { k: "nombre_pastor", required: true }] },
  {
    letter: "B",
    title: "Datos del Beneficiario",
    fields: [
      { k: "primer_nombre", required: true },
      { k: "apellido_paterno", required: true },
      { k: "apellido_materno", required: true },
      { k: "dni_ce", required: true, placeholder: "Ej. 12345678" },
    ],
  },
  {
    letter: "C",
    title: "Dirección",
    fields: [
      { k: "direccion", required: true, full: true },
      { k: "direccion_linea_2", full: true },
      { k: "distrito", required: true },
      { k: "provincia", required: true },
      { k: "departamento", required: true },
      { k: "ciudad", required: true },
      { k: "estado_region", required: true },
      { k: "codigo_postal", required: true },
      { k: "pais", required: true },
    ],
  },
  {
    letter: "D",
    title: "Contacto",
    fields: [
      { k: "email", required: true, type: "email" },
      { k: "telefono", required: true, type: "tel", placeholder: "+51 999 999 999" },
    ],
  },
  {
    letter: "E",
    title: "Datos de la Donación",
    fields: [
      { k: "codigo_identificacion", required: true },
      { k: "fecha_recepcion", required: true, type: "date" },
    ],
  },
];

export function DonacionForm({ values, errors, onChange }: { values: FormValues; errors: FormErrors; onChange: (k: K, v: string) => void }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <section key={s.letter} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{s.letter}</span>
            {s.title}
          </h2>
          {s.letter === "E" && (
            <div className="mt-4 rounded-md bg-accent px-3 py-2 text-sm">
              Tipo de donación: <strong>TABLETA GRÁFICA</strong>
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => {
              const id = `f-${f.k}`;
              const err = errors[f.k];
              return (
                <div key={f.k} className={cn("space-y-1.5", f.full && "sm:col-span-2")}>
                  <Label htmlFor={id}>
                    {fieldLabels[f.k]}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id={id}
                    type={f.type ?? "text"}
                    value={values[f.k]}
                    placeholder={f.placeholder}
                    onChange={(e) => onChange(f.k, e.target.value)}
                    aria-invalid={!!err}
                    aria-describedby={err ? `${id}-err` : undefined}
                    className={cn("h-11 text-base", err && "border-destructive")}
                  />
                  {err && (
                    <p id={`${id}-err`} className="text-sm text-destructive">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
