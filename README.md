# VGR Donation Tracker

Quiero crear una aplicación web profesional en React para gestionar la entrega de TABLETAS GRÁFICAS mediante un formulario de registro y una Declaración Jurada de Recepción de Donación.

IMPORTANTE:
Voy a proporcionar 2 imágenes de referencia:
1. Formulario "Formulario lista de envíos de tarjeta Mision 50".
2. "DECLARACIÓN JURADA DE RECEPCIÓN DE DONACIÓN".

Usa ambas imágenes como REFERENCIA VISUAL del diseño, estructura, textos y distribución. No quiero simplemente una copia como imagen: quiero que todos los campos sean formularios HTML funcionales y que posteriormente se pueda generar un documento PDF con el mismo estilo del documento original.

==================================================
1. TECNOLOGÍA
==================================================

Construye la aplicación utilizando:

- React
- TypeScript
- Vite
- Tailwind CSS
- Diseño completamente responsive
- Componentes reutilizables
- Supabase como backend
- Supabase Database para almacenar los registros
- Supabase Storage para almacenar los documentos generados
- Generación de PDF
- Integración con WhatsApp mediante una API oficial o proveedor compatible
- Variables sensibles mediante .env / Secrets
- Nunca colocar claves API directamente en el código frontend.

La aplicación debe estar preparada para producción.

==================================================
2. IDENTIDAD VISUAL
==================================================

La página debe representar a:

"Voice of God Recordings"

También debe mostrar el logo de VGR de forma visible en:

- Header
- Página principal
- Formulario
- Panel administrativo
- Documentos generados cuando corresponda

Usar las imágenes proporcionadas como referencia.

Si el logo no puede extraerse correctamente de las imágenes, crear un espacio claramente preparado para colocar posteriormente el logo oficial de VGR.

No inventar un logo oficial diferente.

Diseño:

- Profesional
- Limpio
- Institucional
- Moderno
- Buena separación entre secciones
- Tipografía legible
- Bordes suaves
- Formularios claros
- Excelente experiencia en celular y computadora

==================================================
3. MODO CLARO Y OSCURO
==================================================

Implementar:

- Modo claro
- Modo oscuro
- Botón para cambiar entre ambos
- Detectar inicialmente la preferencia del sistema
- Guardar la preferencia del usuario

El modo oscuro debe aplicarse correctamente a:

- Header
- Formularios
- Dashboard
- Tablas
- Modales
- Botones
- Mensajes
- Estados
- PDFs NO deben utilizar el modo oscuro; los documentos generados deben mantener un formato blanco profesional para impresión.

==================================================
4. PÁGINA PRINCIPAL
==================================================

Crear una página de inicio institucional.

Debe mostrar:

Logo VGR

Título:

"Registro de Recepción de Donación"

Subtítulo explicativo:

"Complete el formulario para registrar la recepción de la donación y generar su Declaración Jurada de Recepción de Donación."

Botón principal:

"Registrar recepción"

También mostrar una sección breve explicando el proceso:

1. Completar los datos.
2. Revisar la información.
3. Generar la Declaración Jurada.
4. Confirmar la recepción.
5. Recibir los documentos correspondientes.

==================================================
5. FORMULARIO PRINCIPAL
==================================================

Crear un formulario dividido por secciones.

SECCIÓN A — DATOS DE LA IGLESIA

Campo:

Iglesia

Campo:

Nombre del Pastor *

==================================================
SECCIÓN B — DATOS DEL BENEFICIARIO
==================================================

Campos:

Primer Nombre *

Apellido Paterno *

Apellido Materno *

DNI / CE *

Este campo es necesario porque la Declaración Jurada solicita DNI/CE.

==================================================
SECCIÓN C — DIRECCIÓN
==================================================

Campos:

Dirección *

La dirección puede tener dos líneas como aparece en el documento original.

Ciudad *

Estado / Región *

Código Postal *

País *

Distrito *

Provincia *

Departamento *

Estos campos adicionales son necesarios para completar correctamente la Declaración Jurada.

==================================================
SECCIÓN D — CONTACTO
==================================================

Email *

Teléfono *

==================================================
SECCIÓN E — DATOS DE LA DONACIÓN
==================================================

Agregar:

Tipo de donación:

"TABLETA GRÁFICA"

Código de identificación de la tableta *

Fecha de recepción *

El código de identificación debe ser obligatorio porque aparece en la Declaración Jurada.

La fecha debe poder seleccionarse mediante un selector de fecha.

==================================================
6. VALIDACIÓN
==================================================

Todos los campos marcados con * deben ser obligatorios.

Validar:

- DNI/CE
- Email
- Teléfono
- Código de identificación
- Fecha
- Campos de dirección

Mostrar errores claramente debajo de cada campo.

No permitir enviar el formulario si faltan datos obligatorios.

Antes de enviar, mostrar una pantalla de:

"Revisión de información"

Mostrar todos los datos introducidos.

Permitir:

"Editar información"

o

"Confirmar y generar documentos"

==================================================
7. GENERACIÓN DE DECLARACIÓN JURADA
==================================================

Después de confirmar el formulario, generar automáticamente una Declaración Jurada de Recepción de Donación en PDF.

Debe mantener una estructura visual muy similar a la segunda imagen proporcionada.

Título:

DECLARACIÓN JURADA DE RECEPCIÓN DE DONACIÓN

Incluir los datos del beneficiario automáticamente.

El texto debe conservar la estructura del documento de referencia:

"Yo, [NOMBRE COMPLETO], identificado(a) con DNI/CE N° [DOCUMENTO], con domicilio en [DIRECCIÓN], distrito de [DISTRITO], en la provincia de [PROVINCIA], Departamento de [DEPARTAMENTO]..."

Después incluir:

"Declaro que el día [FECHA], he recibido en calidad de donación y sin costo alguno, la TABLETA GRÁFICA, con código de Identificación N° [CÓDIGO], por parte de la Asociación Grabaciones La Voz de Dios..."

Mantener también la cláusula referente a que la donación es para el estudio de la Palabra de Dios.

IMPORTANTE:

No modificar innecesariamente el contenido legal del documento de referencia.

El sistema debe reemplazar únicamente los campos variables.

==================================================
8. ESPACIO PARA FIRMA Y HUELLA
==================================================

La Declaración Jurada debe incluir:

Nombre

DNI/CE

Espacio para firma

Espacio para huella digital

Mantener una distribución visual similar al documento original.

Agregar una opción para:

"Imprimir documento"

"Descargar PDF"

==================================================
9. FORMULARIO DE ENVÍO
==================================================

También generar un PDF del formulario inicial con todos los datos registrados.

El administrador debe poder descargar:

1. Formulario de registro
2. Declaración Jurada
3. Ambos documentos juntos

Idealmente generar un ZIP con los dos PDF.

==================================================
10. WHATSAPP
==================================================

Esta es una función MUY IMPORTANTE.

Después de completar correctamente el registro, quiero que la información llegue a MI NÚMERO DE WHATSAPP.

NO quiero únicamente un botón que abra WhatsApp.

Quiero que el sistema pueda enviar automáticamente una notificación a mi número mediante una integración de WhatsApp Business/API oficial o proveedor compatible.

La arquitectura debe permitir configurar:

WHATSAPP_ADMIN_NUMBER

mediante variables de entorno / Secrets.

El mensaje debe tener una estructura similar a:

"NUEVO REGISTRO DE RECEPCIÓN DE DONACIÓN

Nombre:
[Nombre completo]

DNI/CE:
[DNI]

Iglesia:
[Iglesia]

Pastor:
[Pastor]

Dirección:
[Dirección]

Distrito:
[Distrito]

Provincia:
[Provincia]

Departamento:
[Departamento]

Ciudad:
[Ciudad]

País:
[País]

Teléfono:
[Teléfono]

Email:
[Email]

Código de tableta:
[Código]

Fecha de recepción:
[Fecha]

Se ha registrado una nueva recepción de donación."

Además, cuando la integración de WhatsApp lo permita, enviar enlaces seguros para descargar:

- Formulario PDF
- Declaración Jurada PDF

IMPORTANTE:

No colocar tokens, API keys o credenciales de WhatsApp en el frontend.

Utilizar Supabase Edge Functions o un backend seguro para realizar el envío.

Preparar toda la arquitectura para que posteriormente solamente tenga que colocar las credenciales de WhatsApp.

Si la API de WhatsApp requiere una plantilla aprobada para mensajes iniciados por la empresa, preparar el sistema para utilizar dicha plantilla.

==================================================
11. BASE DE DATOS
==================================================

Crear una tabla en Supabase llamada:

donaciones

Campos sugeridos:

id
iglesia
nombre_pastor
primer_nombre
apellido_paterno
apellido_materno
nombre_completo
dni_ce
direccion
direccion_linea_2
ciudad
distrito
provincia
departamento
estado_region
codigo_postal
pais
email
telefono
tipo_donacion
codigo_identificacion
fecha_recepcion
formulario_pdf_url
declaracion_pdf_url
created_at
updated_at

Agregar índices para facilitar búsquedas.

==================================================
12. PANEL ADMINISTRATIVO
==================================================

Crear una sección:

"/admin"

Debe requerir autenticación.

El administrador debe poder ver todos los registros.

Mostrar una tabla con:

- Nombre completo
- DNI/CE
- Iglesia
- Ciudad
- Departamento
- Código de identificación
- Fecha de recepción
- Teléfono
- Email
- Fecha de registro

Agregar buscador.

==================================================
13. BUSCADOR AVANZADO
==================================================

Quiero poder buscar registros por cualquier dato importante del formulario.

El buscador debe permitir buscar por:

- Nombre
- Apellido
- Nombre completo
- DNI/CE
- Iglesia
- Pastor
- Ciudad
- Distrito
- Provincia
- Departamento
- Código de identificación
- Email
- Teléfono
- País

Ejemplo:

Si escribo:

"Juan"

debe mostrar todos los registros donde aparezca Juan.

Si escribo:

"12345678"

debe encontrar el registro correspondiente al DNI.

Si escribo el código de la tableta, debe encontrar al beneficiario correspondiente.

Implementar búsqueda eficiente mediante Supabase.

Agregar filtros por:

- Fecha
- Departamento
- Ciudad
- Iglesia
- Estado del registro

==================================================
14. DETALLE DEL REGISTRO
==================================================

Al seleccionar una persona, mostrar una página/modal con todos sus datos.

Mostrar:

Datos personales
Datos de contacto
Datos de dirección
Datos de iglesia
Datos de donación
Fecha de recepción
Código de tableta

Botones:

"Descargar formulario"

"Descargar declaración jurada"

"Descargar ambos"

"Enviar nuevamente por WhatsApp"

"Editar registro"

==================================================
15. CONTROL DE TABLETAS
==================================================

Evitar que el mismo código de identificación sea registrado dos veces.

El campo:

codigo_identificacion

debe ser UNIQUE.

Si alguien intenta registrar un código ya existente mostrar:

"Este código de identificación ya ha sido registrado."

Mostrar también a qué registro pertenece únicamente dentro del panel administrativo autorizado.

==================================================
16. ESTADO DEL REGISTRO
==================================================

Agregar estados:

- Pendiente
- Confirmado
- Documentos generados
- Enviado por WhatsApp

Mostrar cada estado visualmente.

==================================================
17. SEGURIDAD
==================================================

Implementar:

- Autenticación para administrador
- Supabase Row Level Security
- Validación de datos
- Protección de rutas administrativas
- Secrets para claves API
- Nunca exponer credenciales privadas
- No permitir que visitantes normales accedan al dashboard
- Sanitizar entradas
- Protección contra duplicados

Los documentos generados deben tener URLs seguras.

==================================================
18. DISEÑO RESPONSIVE
==================================================

Debe funcionar perfectamente en:

- iPhone
- Android
- iPad
- Laptop
- PC

En móvil:

- Formularios de una sola columna
- Botones grandes
- Inputs fáciles de tocar
- Navegación sencilla

En escritorio:

- Dashboard con tabla
- Panel lateral
- Estadísticas
- Búsqueda avanzada

==================================================
19. DASHBOARD
==================================================

En la pantalla administrativa mostrar estadísticas:

Total de donaciones

Donaciones de este mes

Documentos generados

Documentos enviados

Número de tabletas registradas

También mostrar los registros recientes.

==================================================
20. EXPERIENCIA DEL USUARIO
==================================================

Después de enviar correctamente:

Mostrar:

"Registro completado correctamente"

"Su Declaración Jurada ha sido generada."

Mostrar botones:

"Descargar Declaración Jurada"

"Descargar formulario"

"Descargar ambos"

"Finalizar"

No perder los datos si ocurre un error.

Mostrar estados de carga:

"Guardando información..."

"Generando documentos..."

"Enviando notificación..."

"Registro completado."

==================================================
21. ESTRUCTURA DE LA APLICACIÓN
==================================================

Crear una estructura limpia y escalable.

Por ejemplo:

src/
  components/
  pages/
  layouts/
  hooks/
  services/
  lib/
  types/
  utils/

Separar:

- lógica de formulario
- generación de PDF
- Supabase
- WhatsApp
- autenticación
- búsqueda
- generación de documentos

No poner toda la aplicación en un único archivo.

==================================================
22. IMPORTANTE SOBRE LOS DOCUMENTOS
==================================================

Las dos imágenes que proporcionaré deben utilizarse como referencia para reconstruir visualmente:

A. FORMULARIO DE REGISTRO

B. DECLARACIÓN JURADA

Quiero que los PDFs finales tengan apariencia de documentos institucionales imprimibles.

No quiero que simplemente se descargue una captura de pantalla.

Los datos deben ser texto real dentro del PDF cuando sea posible.

El documento debe poder imprimirse en tamaño A4.

==================================================
23. INFORMACIÓN DE LA ORGANIZACIÓN
==================================================

Utilizar los datos que aparecen en el documento de referencia para la declaración.

La organización aparece como:

Asociación Grabaciones La Voz de Dios

RUC:
205060079170

Representante Legal:
Sr. Roger Alfredo Rojas Flores

La dirección institucional que aparece en el documento debe conservarse como referencia del documento original.

NO cambiar información institucional sin que yo lo solicite.

==================================================
24. RESULTADO FINAL
==================================================

Quiero una aplicación completa y funcional, no un prototipo visual.

Debe funcionar así:

VISITANTE

Inicio
↓
Registrar recepción
↓
Completar formulario
↓
Revisar información
↓
Confirmar
↓
Guardar en Supabase
↓
Generar formulario PDF
↓
Generar Declaración Jurada PDF
↓
Guardar PDFs
↓
Enviar notificación a WhatsApp del administrador
↓
Mostrar pantalla de éxito

ADMINISTRADOR

Login
↓
Dashboard
↓
Buscar personas
↓
Filtrar registros
↓
Abrir registro
↓
Ver datos
↓
Descargar documentos
↓
Enviar nuevamente por WhatsApp

==================================================
25. IMPORTANTE ANTES DE TERMINAR
==================================================

No quiero datos falsos de prueba mezclados con los registros reales.

Si necesitas datos demo, separarlos claramente o utilizar una base de datos de prueba.

No inventes credenciales.

No inventes números de WhatsApp.

Crear un archivo/documentación donde se explique exactamente qué variables de entorno debo configurar.

Por ejemplo:

SUPABASE_URL
SUPABASE_ANON_KEY
WHATSAPP_ADMIN_NUMBER
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID

y cualquier otra variable necesaria.

También explicar cómo configurar la integración de WhatsApp.

Véase [`CONFIGURACION.md`](./CONFIGURACION.md) para el listado completo de variables de entorno y la guía paso a paso de la integración de WhatsApp.

==================================================
26. CALIDAD DEL CÓDIGO
==================================================

Antes de finalizar:

- Revisar errores TypeScript
- Revisar errores de React
- Revisar rutas
- Revisar responsive
- Revisar validaciones
- Revisar Supabase
- Revisar generación de PDF
- Revisar autenticación
- Revisar búsqueda
- Revisar duplicados
- Revisar modo oscuro
- Revisar que los documentos se generen correctamente

No dejar botones que no hagan nada.

Todos los botones principales deben tener una función real.

Crear una aplicación lista para continuar desarrollándose y posteriormente desplegarse en producción.

==================================================
27. CREDENCIALES DE ADMINISTRADOR
==================================================

Correo: `ssj52949@gmail.com`
Contraseña: `josue20026`

Esta cuenta se crea de una de estas dos formas:

1. Registrarse en `/auth` con ese correo y contraseña, e inmediatamente después pulsar "Activar mi cuenta como administrador" (funciona solo mientras el proyecto no tenga aún ningún administrador).
2. Ejecutar el script (requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`):

```sh
node scripts/create-admin.mjs ssj52949@gmail.com josue20026
```

==================================================
28. EJEMPLO PARA LLENAR EL FORMULARIO (/registro)
==================================================

> ⚠️ DATOS DE EJEMPLO — utilizar solo para probar. No registrar datos ficticios en la base de datos real.

Sección A — Datos de la iglesia:
- Iglesia: Iglesia Cristiana Ejemplo
- Nombre del Pastor *: Prueba Pastor

Sección B — Datos del beneficiario:
- Primer Nombre *: Juan
- Apellido Paterno *: Pérez
- Apellido Materno *: Gómez
- DNI / CE *: 12345678 (8 a 12 letras o números, sin espacios)

Sección C — Dirección:
- Dirección *: Av. Siempre Viva 123
- Ciudad *: Lima
- Estado / Región *: Lima
- Código Postal *: 15001
- País *: Perú (viene por defecto)
- Distrito *: Centro
- Provincia *: Lima
- Departamento *: Lima

Sección D — Contacto:
- Email *: prueba@test.com
- Teléfono *: +51 987654321

Sección E — Datos de la donación:
- Tipo de donación: TABLETA GRÁFICA
- Código de identificación de la tableta *: TAB-TEST-001 (3 a 40 letras, números o guiones; debe ser único)
- Fecha de recepción *: 2026-09-24

==================================================

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4625a099-5fc6-42f6-a57f-1995bfea02c9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
