-- Agrega la firma y la huella digital del beneficiario (data URLs PNG) a las donaciones.
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS firma text;
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS huella text;
