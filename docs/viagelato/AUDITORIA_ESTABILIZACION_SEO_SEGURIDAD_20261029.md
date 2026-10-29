# Viagelato — auditoría de estabilización, SEO y seguridad

Fecha: 29 de octubre de 2026

Rama: `codex/estabilizacion-seo-seguridad-20261029`

Base auditada: `main` en `62bd965`

PR: se completa al publicar la rama.

## Alcance y resultado

Se auditó la aplicación Next.js, las Route Handlers públicas y administrativas, el acceso a Supabase, los parches SQL, el checkout deshabilitado, el flujo de solicitud por WhatsApp, SEO técnico y experiencia responsive. No se modificaron proyectos ni variables de Supabase, Render o Vercel; no se aplicaron migraciones ni se realizó un despliegue.

No se confirmó una vulnerabilidad crítica explotable. Se corrigieron hallazgos altos y medios en código, y la corrección de permisos de base quedó preparada —no aplicada— como migración versionada.

## Hallazgos

### Alta — corregidos en código

- Las mutaciones públicas aceptaban solicitudes sin `Origin`; ahora exigen un origen permitido y rechazan `Sec-Fetch-Site: cross-site`, también detrás de Vercel/Render.
- El limitador tomaba el primer valor de `X-Forwarded-For`, que puede ser antepuesto por un cliente. Ahora prioriza un `X-Real-IP` válido y, como respaldo, el último IP válido de la cadena.
- Los cuerpos JSON se leían sin un límite efectivo por streaming. Ahora se valida tipo, tamaño declarado, tamaño real y sintaxis antes de consultar Supabase.
- La ruta WhatsApp podía reutilizar `SUPABASE_SERVICE_ROLE_KEY` como sal del limitador. Ahora exige un secreto independiente en `CHECKOUT_RATE_LIMIT_SALT`.
- `anon` y `authenticated` tenían `SELECT` de fila completa sobre `products`, incluido el stock exacto. El frontend ya usa un DTO público sin stock y la migración revoca el grant amplio para otorgar sólo columnas comerciales.
- Los privilegios por defecto podían exponer objetos futuros de `public`. La migración propuesta revoca grants automáticos y ejecución pública de funciones.

### Media — corregidos

- Se añadieron cabeceras `nosniff`, anti-iframe, política de referrer y bloqueo de permisos sensibles.
- Panel, login, recuperación, actualización de contraseña y carrito ahora declaran `noindex`, `nofollow` y `nocache` explícitos.
- `robots.txt` excluye rutas privadas y el sitemap queda vacío mientras `ENABLE_INDEXING=false`.
- Se añadieron canonical en páginas públicas principales y JSON-LD verificable para `Organization`, `Product`, `Offer` y `BreadcrumbList`, sin reseñas, disponibilidad ni sucursales inventadas.
- `getStore` y `getProductBySlug` usan memoización por solicitud para evitar consultas repetidas desde layout, metadata y página.
- La prueba PostgreSQL de checkout estaba desactualizada respecto del bloqueo de publicación del Corte 08; ahora crea un producto completo.
- Se eliminaron ocho advertencias ESLint en tests.

### Pendientes / riesgos

- La migración `20261029212638_harden_public_api_and_product_columns.sql` no fue aplicada ni probada contra una base real. Debe validarse primero en una rama/base descartable de Supabase.
- El repositorio conserva el esquema base más parches históricos en `supabase/patches`; sólo este corte nuevo está en `supabase/migrations`. Antes de automatizar despliegues de DB conviene consolidar una línea base sin reescribir el historial ya aplicado.
- No existe todavía una política comercial/técnica de retención y eliminación automática para datos personales de pedidos y solicitudes WhatsApp.
- La confianza en cabeceras de proxy debe verificarse con requests reales de Vercel y Render después de configurar el entorno; las pruebas actuales simulan cadenas válidas y maliciosas.
- No se agregó CSP porque Next.js requiere definir y probar una estrategia de nonce para scripts inline; debe abordarse en un corte dedicado para no bloquear hidratación ni JSON-LD.
- Los textos legales siguen sujetos a validación profesional y comercial.
- La PR #23 continúa abierta y concentra canonical/Open Graph/Twitter de la ficha de producto. Este corte no modifica `src/app/productos/[slug]/page.tsx`; agrega el JSON-LD desde su layout para evitar conflicto.
- No se verificaron CRUD, Auth, RLS ni aislamiento contra un proyecto Supabase real. Las pruebas SQL preparadas no deben confundirse con una ejecución real.

## Cambios principales

- Seguridad HTTP y entrada: `src/lib/request-security.ts`, Route Handlers de checkout/WhatsApp y `next.config.ts`.
- Minimización de datos: `src/lib/site.ts`, `src/lib/types.ts` y componentes públicos de catálogo/carrito.
- SEO: metadata de páginas públicas, layouts privados, `robots.ts`, `sitemap.ts` y componentes de datos estructurados.
- Base de datos: migración versionada de grants, privilegios por defecto e índices de claves foráneas.
- Pruebas: regresiones unitarias/SEO/headers y scripts PostgreSQL de checkout y aislamiento.

## Migración propuesta

`supabase/migrations/20261029212638_harden_public_api_and_product_columns.sql`

- Revoca el `SELECT` público completo de `products`.
- Concede sólo columnas necesarias para catálogo; excluye `stock` y banderas internas.
- Revoca privilegios automáticos para tablas, secuencias y funciones futuras.
- Agrega índices para `whatsapp_request_events.actor_user_id` y `whatsapp_request_payments.recorded_by`.

## Validación real ejecutada

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado, sin advertencias.
- `npm test`: 38 archivos, 158 pruebas aprobadas.
- `npm run build`: aprobado con Next.js 16.4.3; 20 páginas estáticas generadas.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilidades.
- Playwright 1.64.1 en `http://127.0.0.1:3100`:
  - 1440×900: inicio → catálogo → búsqueda `alfajor` → agregar → carrito → formulario → error controlado por Supabase no configurado.
  - 390×844: menú móvil → catálogo → búsqueda/agregado → carrito.
  - Sin overflow horizontal, overlay de framework ni errores relevantes de consola.
  - El POST deliberado devuelve 503 y muestra “La recepción de solicitudes todavía no está configurada”; no crea pedido.

No se ejecutaron `security-invariants.sql` ni `checkout-invariants.sql` porque no había una base PostgreSQL/Supabase descartable configurada.

## Recomendación para el próximo corte

1. Aplicar esquema, parches y migraciones en una base temporal; ejecutar ambos scripts de `tests/integration/postgres` y Supabase Advisors.
2. Verificar Auth administrativo, RLS, Storage y CRUD con usuarios reales de prueba.
3. Validar cabeceras de proxy y rate limiting desde Vercel/Render.
4. Revisar y fusionar por separado la PR #23; ejecutar nuevamente pruebas SEO.
5. Definir retención de datos y validar textos legales antes de habilitar `ENABLE_CHECKOUT` o `ENABLE_INDEXING`.
