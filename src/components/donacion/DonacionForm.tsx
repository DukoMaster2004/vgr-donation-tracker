import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldLabels, type DonacionInput } from "@/lib/donacion-schema";
import { generateLocalFingerprint, svgToPngDataUrl, type FingerprintResult } from "@/lib/fingerprint";
import { cn } from "@/lib/utils";

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

function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = value;
  }, [value]);

  const getPos = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pos = getPos(event);
    if (!canvas || !ctx || !pos) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
    event.preventDefault();
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pos = getPos(event);
    if (!canvas || !ctx || !pos) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    event.preventDefault();
  };

  const end = () => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>Firma</Label>
      <div className="rounded-md border bg-white p-2">
        <canvas
          ref={canvasRef}
          width={640}
          height={220}
          className="h-32 w-full rounded-sm border bg-white touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>Borrar</Button>
      </div>
    </div>
  );
}

function FingerprintCapture({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);

  useEffect(() => {
    if (!value) {
      setFingerprint(null);
      return;
    }

    void generateLocalFingerprint(value)
      .then((result) => setFingerprint(result))
      .catch(() => setFingerprint(null));
  }, [value]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = String(reader.result ?? "");
      try {
        const result = await generateLocalFingerprint(imageDataUrl);
        const fingerprintPng = await svgToPngDataUrl(result.visual_fingerprint);
        onChange(fingerprintPng);
      } catch {
        onChange(imageDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label>Huella digital</Label>
      <Input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileRef}
        onChange={handleFile}
        className="h-auto py-2"
      />
      {value ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-2">
          <img src={value} alt="Huella digital" className="mx-auto max-h-60 w-full max-w-[260px] rounded-md border bg-white object-contain shadow-sm" />
          {fingerprint ? (
            <div className="space-y-2 rounded-md border bg-background p-2">
              <div className="text-xs font-medium text-muted-foreground">Huella local generada</div>
              <div className="overflow-hidden rounded border bg-[#050816] p-2 [&_svg]:h-[220px] [&_svg]:w-full [&_svg]:object-contain" dangerouslySetInnerHTML={{ __html: fingerprint.visual_fingerprint }} />
              <div className="text-[10px] break-all text-muted-foreground">Hash: {fingerprint.hash}</div>
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>Quitar</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Use la cámara del celular para tomar una foto de la huella del dedo.</p>
      )}
    </div>
  );
}

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

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">F</span>
          Firma y huella digital
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <SignaturePad value={values.firma} onChange={(v) => onChange("firma", v)} />
          <FingerprintCapture value={values.huella} onChange={(v) => onChange("huella", v)} />
        </div>
      </section>
    </div>
  );
}
