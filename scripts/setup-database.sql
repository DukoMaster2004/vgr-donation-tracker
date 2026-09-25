-- Setup completo de la base de datos para el VGR Donation Tracker.
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query → pegar → Run.
-- Idempotente: se puede volver a ejecutar sin errores.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_donacion AS ENUM ('pendiente','confirmado','documentos_generados','enviado_whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE IF NOT EXISTS public.donaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iglesia text,
  nombre_pastor text NOT NULL,
  primer_nombre text NOT NULL,
  apellido_paterno text NOT NULL,
  apellido_materno text NOT NULL,
  nombre_completo text NOT NULL,
  dni_ce text NOT NULL,
  direccion text NOT NULL,
  direccion_linea_2 text,
  ciudad text NOT NULL,
  distrito text NOT NULL,
  provincia text NOT NULL,
  departamento text NOT NULL,
  estado_region text NOT NULL,
  codigo_postal text NOT NULL,
  pais text NOT NULL,
  email text NOT NULL,
  telefono text NOT NULL,
  tipo_donacion text NOT NULL DEFAULT 'TABLETA GRÁFICA',
  codigo_identificacion text NOT NULL UNIQUE,
  fecha_recepcion date NOT NULL,
  formulario_pdf_url text,
  declaracion_pdf_url text,
  estado public.estado_donacion NOT NULL DEFAULT 'pendiente',
  whatsapp_message_id text,
  whatsapp_status text,
  whatsapp_status_at timestamptz,
  whatsapp_error text,
  busqueda text GENERATED ALWAYS AS (lower(
    coalesce(nombre_completo,'') || ' ' || coalesce(dni_ce,'') || ' ' || coalesce(iglesia,'') || ' ' ||
    coalesce(nombre_pastor,'') || ' ' || coalesce(ciudad,'') || ' ' || coalesce(distrito,'') || ' ' ||
    coalesce(provincia,'') || ' ' || coalesce(departamento,'') || ' ' || coalesce(codigo_identificacion,'') || ' ' ||
    coalesce(email,'') || ' ' || coalesce(telefono,'') || ' ' || coalesce(pais,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.donaciones TO authenticated;
GRANT ALL ON public.donaciones TO service_role;
ALTER TABLE public.donaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins select" ON public.donaciones;
CREATE POLICY "Admins select" ON public.donaciones FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update" ON public.donaciones;
CREATE POLICY "Admins update" ON public.donaciones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete" ON public.donaciones;
CREATE POLICY "Admins delete" ON public.donaciones FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS donaciones_busqueda_trgm ON public.donaciones USING gin (busqueda gin_trgm_ops);
CREATE INDEX IF NOT EXISTS donaciones_dni_idx ON public.donaciones (dni_ce);
CREATE INDEX IF NOT EXISTS donaciones_fecha_idx ON public.donaciones (fecha_recepcion);
CREATE INDEX IF NOT EXISTS donaciones_depto_idx ON public.donaciones (departamento);
CREATE INDEX IF NOT EXISTS donaciones_ciudad_idx ON public.donaciones (ciudad);
CREATE INDEX IF NOT EXISTS donaciones_created_idx ON public.donaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS donaciones_wa_idx ON public.donaciones (whatsapp_message_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS donaciones_updated ON public.donaciones;
CREATE TRIGGER donaciones_updated BEFORE UPDATE ON public.donaciones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id text NOT NULL UNIQUE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text
);
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read events" ON public.whatsapp_webhook_events;
CREATE POLICY "Admins read events" ON public.whatsapp_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS wa_events_pending ON public.whatsapp_webhook_events (received_at) WHERE processed_at IS NULL;

-- Bucket privado para los PDFs generados (acceso mediante URLs firmadas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read documentos" ON storage.objects;
CREATE POLICY "Admins read documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos' AND public.has_role(auth.uid(),'admin'));
