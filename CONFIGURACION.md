# Configuración

Secrets (Project Settings → Secrets):
- WHATSAPP_API_KEY / LOVABLE_API_KEY — se crean al conectar WhatsApp (Connectors → WhatsApp).
- WHATSAPP_ADMIN_NUMBER — su número con código de país, solo dígitos (ej. 51999999999).
- WHATSAPP_TEMPLATE_NAME (opcional) — plantilla aprobada por Meta, necesaria para mensajes fuera de la ventana de 24 h. Parámetros del cuerpo: {{1}} nombre, {{2}} DNI/CE, {{3}} código, {{4}} fecha, {{5}} enlace de la declaración.
- WHATSAPP_TEMPLATE_LANG (opcional, por defecto `es`).

Base de datos y almacenamiento ya configurados por Lovable Cloud (no requieren claves).

Webhook de estados: POST /api/public/whatsapp/webhook — seleccione este proyecto en Connectors → WhatsApp → Incoming messages.

Administrador: cree su cuenta en /auth y pulse "Activar mi cuenta como administrador" (solo funciona mientras no exista otro administrador).

Logo oficial: reemplace `OFFICIAL_LOGO_URL` en src/components/brand/VgrLogo.tsx.

## Publicar en Vercel
1. Importe el repositorio en Vercel (Framework: Other). Build command: `bun run build` (o `npm run build`).
2. Vercel detecta la variable `VERCEL` y el proyecto se compila automáticamente para Vercel.
3. En Vercel → Settings → Environment Variables agregue:
   - VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID (copiar del archivo .env)
   - SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (mismos valores)
   - SUPABASE_SERVICE_ROLE_KEY (clave privada del backend; necesaria para guardar registros)
   - WHATSAPP_ADMIN_NUMBER, WHATSAPP_API_KEY, LOVABLE_API_KEY y opcionales de plantilla
También puede publicar directamente con el botón Publicar de Lovable sin configurar nada.
