import { z } from "zod";

const txt = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} es obligatorio` })
    .max(max, { message: `${label} no puede superar ${max} caracteres` })
    .transform((v) => v.replace(/[<>]/g, ""));

export const donacionSchema = z.object({
  iglesia: z
    .string()
    .trim()
    .max(150)
    .transform((v) => v.replace(/[<>]/g, ""))
    .optional()
    .default(""),
  nombre_pastor: txt("Nombre del Pastor", 150),
  primer_nombre: txt("Primer Nombre", 80),
  apellido_paterno: txt("Apellido Paterno", 80),
  apellido_materno: txt("Apellido Materno", 80),
  dni_ce: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8,12}$/, { message: "DNI/CE inválido (8 a 12 letras o números, sin espacios)" }),
  direccion: txt("Dirección", 200),
  direccion_linea_2: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v.replace(/[<>]/g, ""))
    .optional()
    .default(""),
  ciudad: txt("Ciudad"),
  estado_region: txt("Estado / Región"),
  codigo_postal: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,10}$/, { message: "Código postal inválido" }),
  pais: txt("País"),
  distrito: txt("Distrito"),
  provincia: txt("Provincia"),
  departamento: txt("Departamento"),
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, { message: "Teléfono inválido (solo números, puede iniciar con +)" }),
  codigo_identificacion: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,40}$/, { message: "Código inválido (3 a 40 letras, números o guiones)" })
    .transform((v) => v.toUpperCase()),
  fecha_recepcion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Seleccione una fecha válida" }),
});

export type DonacionInput = z.input<typeof donacionSchema>;
export type DonacionData = z.output<typeof donacionSchema>;

export const emptyDonacion: Record<keyof DonacionInput, string> = {
  iglesia: "",
  nombre_pastor: "",
  primer_nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  dni_ce: "",
  direccion: "",
  direccion_linea_2: "",
  ciudad: "",
  estado_region: "",
  codigo_postal: "",
  pais: "Perú",
  distrito: "",
  provincia: "",
  departamento: "",
  email: "",
  telefono: "",
  codigo_identificacion: "",
  fecha_recepcion: "",
};

export const fieldLabels: Record<keyof DonacionInput, string> = {
  iglesia: "Iglesia",
  nombre_pastor: "Nombre del Pastor",
  primer_nombre: "Primer Nombre",
  apellido_paterno: "Apellido Paterno",
  apellido_materno: "Apellido Materno",
  dni_ce: "DNI / CE",
  direccion: "Dirección",
  direccion_linea_2: "Dirección (línea 2)",
  ciudad: "Ciudad",
  estado_region: "Estado / Región",
  codigo_postal: "Código Postal",
  pais: "País",
  distrito: "Distrito",
  provincia: "Provincia",
  departamento: "Departamento",
  email: "Email",
  telefono: "Teléfono",
  codigo_identificacion: "Código de identificación de la tableta",
  fecha_recepcion: "Fecha de recepción",
};

export const ESTADOS = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  documentos_generados: "Documentos generados",
  enviado_whatsapp: "Enviado por WhatsApp",
} as const;

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { dia: String(d), mes: MESES[m - 1] ?? "", anio: String(y), texto: `${d} de ${MESES[m - 1]} de ${y}` };
}
