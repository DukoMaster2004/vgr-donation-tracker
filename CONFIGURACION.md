# Configuración

WhatsApp se envía directamente vía la API oficial de Meta (WhatsApp Cloud API), sin pasar por Lovable.

Secrets (Project Settings → Secrets):
- WHATSAPP_API_KEY — token de acceso permanente de la app de Meta (System User Token).
- WHATSAPP_PHONE_NUMBER_ID — ID del número de teléfono en Meta for Developers (WhatsApp → API Setup).
- WHATSAPP_APP_SECRET — App Secret de la app de Meta, para verificar la firma del webhook (X-Hub-Signature-256).
- WHATSAPP_VERIFY_TOKEN — token propio que usted define, usado en el handshake de verificación del webhook (hub.verify_token).
- WHATSAPP_ADMIN_NUMBER — su número con código de país, solo dígitos (por defecto 51951012633 si no se define).
- WHATSAPP_TEMPLATE_NAME (opcional) — plantilla aprobada por Meta, necesaria para mensajes fuera de la ventana de 24 h. Parámetros del cuerpo: {{1}} nombre, {{2}} DNI/CE, {{3}} código, {{4}} fecha, {{5}} enlace de la declaración.
- WHATSAPP_TEMPLATE_LANG (opcional, por defecto `es`).

Base de datos y almacenamiento ya configurados por Lovable Cloud (no requieren claves).

Webhook: configure en Meta for Developers → WhatsApp → Configuration → Webhook, con URL `https://<su-dominio>/api/public/whatsapp/webhook` y el mismo valor de WHATSAPP_VERIFY_TOKEN. Suscríbase al campo `messages`.

Inicio de sesión con Google: habilite el proveedor Google en Supabase (Authentication → Providers → Google) con su Client ID y Client Secret, y agregue `<su-dominio>/auth` como Redirect URL autorizado.

Administrador: cree su cuenta en /auth (con correo o Google) y pulse "Activar mi cuenta como administrador" (solo funciona mientras no exista otro administrador).

Logo oficial: reemplace `OFFICIAL_LOGO_URL` en src/components/brand/VgrLogo.tsx.

