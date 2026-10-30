# Viagelato — estabilización, SEO y seguridad · 29/10/2026

## Alcance y estado

Repositorio `DylanDev08/Viagelato`, base `main` en `62bd9655e8b831390e26e8f37005677f5ca2fb9c`, rama `fix/stability-security-20261029`.

La carpeta del IDE contiene un starter sin Git y con Mercado Pago. Se preservó íntegra. El trabajo se realizó en la copia separada `viagelato-audit`, clonada del repositorio solicitado. No se incorporó la arquitectura ni el circuito de pagos del starter.

Se revisaron rutas públicas y administrativas, componentes, reglas comerciales, autenticación/recuperación, esquema y parches SQL, carga de imágenes, configuración, CI y tests. No se rehicieron estilos ni navegación. No hubo merge, despliegue de producción, mutaciones de datos reales ni aplicación remota de migraciones.

La PR #23 se revisó antes de editar SEO: https://github.com/DylanDev08/Viagelato/pull/23. Sigue siendo responsable de canonical, Open Graph, Twitter y noindex de fichas inexistentes. Aquí no se copiaron sus metadatos ni tests. En la ficha se agregaron sólo imports y JSON-LD; al integrar ambas PR revisar el hunk contiguo de `page.tsx`.

## Hallazgos por gravedad

| Gravedad | Hallazgo y evidencia | Resolución |
| --- | --- | --- |
| Crítica | No se confirmó una vulnerabilidad crítica en las comprobaciones realizadas. Esto no certifica ausencia de vulnerabilidades. | Se mantienen controles y pendientes de staging. |
| Alta | `consume_checkout_attempt` contaba claves únicas, no solicitudes: repetir UUID evitaba consumir límite. Contar y escribir sin bloqueo también permitía carreras. | Migración aditiva con contador y advisory lock transaccional por cliente. Repeticiones y concurrencia comprobadas en PostgreSQL real. |
| Alta | Productos publicados ignoraban su stock administrado al agregarse al carrito y en la ruta WhatsApp. Podían solicitarse cantidades superiores a las informadas. | Límite en tarjeta/ficha/carrito y revalidación server-side. Los productos importados para consulta conservan disponibilidad manual; no se inventa stock ni se reservan unidades. |
| Alta | La ruta WhatsApp leía todo el cuerpo antes de medirlo; checkout legado no imponía límite explícito y aceptaba cualquier origen cuando estaba habilitado. | Lectura JSON limitada a 16.000 bytes mientras se consume el stream, MIME exacto y origen propio/canónico. Rechazo antes de usar service role. |
| Media | Excepciones de transporte Supabase podían terminar en respuesta no controlada. La tienda ignoraba errores de configuración, zonas, categorías o banners y mezclaba defaults con datos parciales. | JSON de error seguro 503 en ambas rutas; carga comercial falla de forma explícita ante cualquier consulta fallida; página de reintento. |
| Media | `sessionStorage` podía fallar al acceder a la propiedad antes de entrar al helper. Cambiar cantidades/datos dejaba visible un enlace preparado con información anterior. | Wrapper con respaldo en memoria de clave/huella, sin datos personales persistidos; vínculo visible sólo para la selección preparada; controles bloqueados durante envío. |
| Media | `/admin`, login, recuperación y carrito heredaban robots globales; al habilitar indexación podían indexarse. Sitemap podía quedar cacheado y publicaba la redirección `/productos`. | Cabeceras noindex/no-store, robots completos, sitemap dinámico sin redirecciones y vacío con indexación deshabilitada o dominio inválido. |
| Media | Faltaban datos estructurados y canonical en inicio/catálogo. | Organization, Product, Offer y BreadcrumbList desde datos existentes; canonical en inicio/catálogo. No se agrega disponibilidad, reseñas, sucursales ni valoraciones. JSON-LD escapa `<`. |
| Media | Supabase informa protección de contraseñas filtradas deshabilitada. | Pendiente de configuración autorizada; no se cambió Auth. [Referencia del asesor](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). |
| Media | Render usa una rama de infraestructura anterior y no tiene `healthCheckPath` HTTP configurado. | Pendiente coordinar versiones del backend legado y configurar health check mediante un cambio operativo separado. No se modificó infraestructura. |
| Media | El esquema base no incluye todos los parches históricos. README describía el checkout anterior e incluía caracteres NUL. | README reemplazado con flujo vigente, requisitos y orden de aplicación en bases nuevas; no se ejecutan ciegamente los parches en bases existentes. |
| Baja | Dos FK de auditoría WhatsApp sin índice, informadas por Supabase. | Índices propuestos en la migración para `actor_user_id` y `recorded_by`. [Referencia del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). |
| Baja | API y carrito sumaban importes con flotantes. `setQuantity` permitía NaN/fracciones en memoria. | Subtotal en centavos y cantidades enteras finitas; límite de 50 líneas también en memoria. |
| Baja | Duplicación de consultas de tienda entre metadata y render; avisos de lint en tests previos. | React.cache por render de servidor; se conservan 8 advertencias preexistentes, sin errores ESLint. |

## Seguridad y datos verificados

Se identificó el proyecto Supabase `mxopaakzlmjbnrwolpgh` (Viagelato-ECommerce). Se realizaron únicamente consultas de metadatos de esquema/permisos y asesores: no se leyeron nombres, direcciones, solicitudes ni pagos reales.

- Las 14 tablas de `public` tienen RLS habilitada.
- Las políticas públicas sólo permiten lectura de categorías, configuración pública, productos publicados/verificados con precio positivo, zonas listas y banners activos.
- Las siete funciones sensibles inspeccionadas usan SECURITY INVOKER y niegan EXECUTE a anon/authenticated.
- El asesor muestra nueve avisos informativos de tablas privadas con RLS sin políticas. Es el modelo deliberado de denegación pública; no se agregaron políticas permisivas para silenciarlo.
- La service role está en módulo `server-only`; las mutaciones administrativas verifican sesión con `getUser`, membresía `admin_users` y origen en servidor. La autorización no usa user_metadata.
- La carga de imágenes verifica tamaño, tipo y firma, genera nombre aleatorio y sólo usa Storage desde backend administrativo. No se modificó su contrato.
- El aislamiento del comercio frente a otros negocios es por proyecto Supabase independiente. No se añadió un modelo multi-tenant ni políticas por comprador inexistente.

La suite SQL ejecuta operaciones reales bajo roles anon/authenticated/service_role en PostgreSQL descartable. Comprueba bloqueo de lectura de clientes/bancos, bloqueo de escritura pública, privacidad de borradores, permisos RPC y seguimiento comercial con pago parcial/idempotente. La preparación de auth/storage es mínima: no certifica Supabase Auth, PostgREST ni Storage reales.

## Checkout y administración

Se conserva carrito → datos/localidad → preparación de mensaje → WhatsApp → confirmación manual. Abrir WhatsApp no marca contacto, pago ni pedido confirmado. No se vacía el carrito automáticamente. El servidor conserva fotografía de precios y líneas para reintentos y usa la clave de idempotencia existente; los errores de red no obligan a generar una nueva clave.

Las tarifas del flujo vigente se acuerdan por WhatsApp. El mensaje y resumen distinguen subtotal de total final y condicionan envío gratuito a localidad/umbral y confirmación comercial. No se inventaron tarifas ni días. El circuito legado de reservas sigue separado y deshabilitado con ENABLE_CHECKOUT=false; esta variable no bloquea solicitudes WhatsApp cuando existe conexión Supabase.

CRUD de productos/categorías/banners/zonas/configuración, permisos, errores, recuperación de contraseña y panel móvil tienen cobertura en tests existentes. No se simuló un inicio de sesión administrativo real ni se cargaron imágenes a producción. Se mantiene la dirección comercial ya respaldada en el repositorio; no se agregaron sucursales. Políticas y términos comerciales requieren validación del comercio.

## Migración propuesta

`supabase/migrations/20261030000158_checkout_attempt_limits.sql`, generada con Supabase CLI. El timestamp es UTC; corresponde al 29/10 local.

Agrega `checkout_attempts.attempt_count` con default 1, reemplaza el limitador conservando firma/privilegios, valida parámetros, bloquea por cliente y cuenta reintentos. Al alcanzar el límite no inserta nuevas filas rechazadas. Mantiene expiración por ventana y limpieza de registros de más de 24 horas. Agrega los dos índices de FK informados por el asesor.

Es transaccional, aditiva y no cambia productos, precios, pedidos, stock ni credenciales. Requiere los parches previos de WhatsApp. Se probó sobre esquema base + todos los parches + migración en una base descartable. No se aplicó remotamente. Antes de su aplicación revisar volumen y duración del ALTER/creación de índices en staging; coordinar una ventana operativa si el volumen lo requiere.

## Resultados reales de validación

Entorno local Windows, Node 24.19.0, npm 11.17.0, Next instalado 16.4.3 por lockfile, PostgreSQL 17 en Docker.

| Comprobación | Resultado |
| --- | --- |
| npm ci --ignore-scripts | Instalación aprobada, lockfile conservado |
| npm run typecheck | Aprobado |
| npm run lint | 0 errores; 8 advertencias preexistentes por variables sin uso en tests |
| npm test -- --reporter=dot | 41 archivos, 173 pruebas aprobadas |
| npm run test:db | VIAGELATO_DB_TESTS_OK y VIAGELATO_SECURITY_TESTS_OK |
| Concurrencia real del limitador | VIAGELATO_CONCURRENT_LIMIT_OK: 3 de 12 admitidos con límite 3 |
| npm run build | Aprobado; compilación, TypeScript y 19 páginas estáticas generadas |
| npm audit --json | 0 vulnerabilidades reportadas por npm en el lockfile instalado |
| HTTP local sobre build de producción | Inicio/catálogo/carrito/login/recuperación 200; admin 307 a login; API de sesión 401; producto inexistente 404 |
| SEO local | Una H1 en páginas públicas consultadas; canonical inicio/catálogo; cabeceras noindex/no-store en rutas privadas; sitemap vacío sin indexación |
| QA visual móvil real | Pendiente. Navegador compartido en uso; los tests de navegación móvil son JSDOM, no mediciones visuales ni Core Web Vitals |

JSDOM emite `Not implemented: navigation to another Document` en tests que preparan WhatsApp; los tests pasan, pero ese mensaje no prueba navegación real a WhatsApp ni envío de mensajes.

La CI incorpora PostgreSQL descartable y npm audit, y también se activa ante cambios SQL/configuración. Sus resultados remotos deben comprobarse en la PR; no se presentan como aprobados antes de ejecutarse.

## Infraestructura observada en modo lectura

Vercel: proyecto `viagelato`, Node 22.x, dominio `viagelato.vercel.app`, último deployment informado READY. Health público respondió 200 con host vercel, databaseConfigured=true y checkoutEnabled=false.

Render: workspace confirmado por el usuario, servicio `viagelato-api`, rama `chore/viagelato-render-vercel-20261028`, autoDeploy apagado, plan free, start con 0.0.0.0/$PORT, healthCheckPath vacío. Último deploy informado live, commit `563092495055d966de23469fc531e5d61655e800`. Su health respondió 200 con host render, databaseConfigured=true y checkoutEnabled=false.

El sitio remoto todavía devuelve robots bloqueando todo, sitemap con 10 entradas y sin nuevas cabeceras en recuperación/API. Son observaciones de la versión desplegada: esta rama no está en producción. La separación de rutas en next.config se conserva (checkout legado/cron en Render; admin/health/WhatsApp en web).

Se consultó la documentación oficial de [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [health checks Render](https://render.com/docs/health-checks) y [despliegues Render](https://render.com/docs/deploys), además de las guías incluidas en el Next instalado. Las skills Supabase, buenas prácticas PostgreSQL, React y render-monitor se aplicaron al alcance correspondiente.

## Riesgos pendientes y siguiente corte

1. Revisar/aplicar la migración en staging y comprobar de nuevo asesores; producción conserva el limitador previo hasta una aplicación autorizada.
2. Validar recuperación real de contraseña, sesiones caducadas, CRUD e imágenes usando una cuenta de staging. Revisar configuración de contraseñas filtradas sin cambiarla automáticamente.
3. Probar WhatsApp en Android/iOS reales, bloqueo de storage, retorno de la aplicación y cortes de red. No se enviaron mensajes durante esta auditoría.
4. Medir Core Web Vitals y accesibilidad visual con datos reales. Hay imágenes `unoptimized` y varios estilos acumulados: requieren medición antes de refactorizar o cambiar diseño.
5. Coordinar PR #23 y el dominio canónico antes de habilitar indexación. Revisar legal/políticas para no publicar documentos provisionales como definitivos.
6. Alinear versión operativa de Vercel/Render y definir health check HTTP en un cambio justificado posterior. Verificar cabeceras de IP/origen del proxy y el límite compartido por clientes de una misma IP.
7. Definir retención y eliminación operativa de solicitudes/borradores y notificaciones administrativas. No se borraron datos ni se creó un proceso de limpieza comercial.
8. La consulta de precios y el guardado de solicitudes WhatsApp no reservan stock ni son una transacción de inventario. La confirmación manual sigue siendo necesaria; no prometer disponibilidad automática.

## Archivos modificados

El listado siguiente incluye código, pruebas, migración y documentación de este corte. El lockfile y el esquema base se conservan.
- `.github/workflows/quality.yml`
- `README.md`
- `next.config.ts`
- `package.json`
- `src/app/api/checkout/route.ts`
- `src/app/api/whatsapp-request/route.ts`
- `src/app/catalogo/page.tsx`
- `src/app/error.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/productos/[slug]/page.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/components/cart.tsx`
- `src/components/checkout.tsx`
- `src/components/product-card.tsx`
- `src/components/product-purchase.tsx`
- `src/components/structured-data.tsx`
- `src/lib/checkout-idempotency.ts`
- `src/lib/product-availability.ts`
- `src/lib/request-body.ts`
- `src/lib/seo.ts`
- `src/lib/site.ts`
- `src/lib/structured-data.ts`
- `supabase/migrations/20261030000158_checkout_attempt_limits.sql`
- `tests/checkout-idempotency.test.ts`
- `tests/checkout-security.test.ts`
- `tests/integration/postgres/README.md`
- `tests/integration/postgres/bootstrap.sql`
- `tests/integration/postgres/checkout-invariants.sql`
- `tests/integration/postgres/run.mjs`
- `tests/integration/postgres/security-invariants.sql`
- `tests/request-body.test.ts`
- `tests/seo-routes.test.ts`
- `tests/stock-purchase.test.tsx`
- `tests/store-data-errors.test.ts`
- `tests/structured-data.test.ts`
- `tests/whatsapp-request-api.test.ts`
- `docs/viagelato/INFORME_ESTABILIZACION_20261029.md`
