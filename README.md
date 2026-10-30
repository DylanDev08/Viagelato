# Viagelato — catálogo y solicitudes por WhatsApp

Next.js 16, React 19, TypeScript y Supabase. Se conserva la identidad monocromática y no se integran pasarelas de pago.

## Desarrollo local

1. Usar Node.js 22 o 24.
2. Ejecutar `npm ci` para instalar las versiones del lockfile.
3. Copiar `.env.example` a `.env.local` y completar exclusivamente credenciales del proyecto Viagelato.
4. Ejecutar `npm run dev`.

Sin Supabase conectado se muestra el catálogo histórico de respaldo; no representa stock vigente ni permite registrar solicitudes reales. No utilizar ese modo para certificar operación comercial.

## Flujo vigente

El comprador agrega productos y cantidades al carrito, completa nombre/localidad y prepara una solicitud por `POST /api/whatsapp-request`. El servidor consulta precios y visibilidad vigentes, verifica stock de productos publicados y guarda una fotografía comercial con idempotencia. Las presentaciones importadas para consulta no tienen stock confirmado: su disponibilidad se coordina manualmente.

Se abre WhatsApp con el mensaje para revisar y enviar. Abrir el enlace no confirma envío, venta, pago ni reserva de mercadería. El carrito permanece guardado. El administrador registra contacto, verifica stock, acuerda envío y confirma el pedido; las transferencias se registran manualmente con importe e idempotencia.

`/api/checkout` y el cron de reservas son un circuito legado separado y permanecen protegidos por `ENABLE_CHECKOUT=false`. Esa variable no desactiva la recepción de solicitudes por WhatsApp cuando Supabase está conectado. No habilitar el circuito legado sin una decisión comercial y QA específico.

## Base de datos y migraciones

El proyecto identificado para Viagelato es `mxopaakzlmjbnrwolpgh`. No reutilizar bases de otros negocios.

Para una base **nueva y descartable**, aplicar `supabase/schema.sql`, los archivos de `supabase/patches` ordenados por nombre y luego `supabase/migrations` ordenadas por nombre. El esquema base por sí solo no contiene los cambios históricos del flujo WhatsApp.

Para una base existente, inventariar primero las columnas, funciones y parches ya aplicados. No ejecutar otra vez todo el esquema ni todos los parches: algunos contienen actualizaciones de visibilidad. Revisar cada migración pendiente, probarla en staging y coordinar su aplicación. Este corte no aplica SQL a producción.

La migración `20261030000158_checkout_attempt_limits.sql` agrega conteo de reintentos, serializa el limitador por cliente y agrega dos índices de claves foráneas. No modifica pedidos, precios ni stock. Requiere los parches de WhatsApp previos. El nombre fue generado por Supabase CLI en UTC (30/10; fecha local del corte: 29/10).

Crear el usuario administrador con Supabase Auth y conceder su UUID en `admin_users` mediante un procedimiento operativo autorizado. Las tablas privadas no tienen políticas públicas; esto es deliberado. La service role se utiliza sólo en servidor, después de verificar la sesión y el permiso administrativo para las operaciones del panel.

## Configuración

- `NEXT_PUBLIC_SITE_URL`: origen público HTTPS canónico, sin ruta. Localmente puede usarse `http://localhost:3000`; no habilita indexación.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: configuración pública del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`, `CHECKOUT_RATE_LIMIT_SALT`, `CRON_SECRET`: secretos de servidor; nunca usar prefijo `NEXT_PUBLIC_`.
- `ENABLE_INDEXING=false`: mantener hasta validar contenido, políticas y dominio. Sitemap vacío y robots bloqueado antes del lanzamiento.
- `API_ORIGIN`: sólo para el backend legado en Render. Admin, health y solicitudes por WhatsApp se resuelven en el servidor web. No configurarlo en Render para evitar bucles.
- `ADMIN_ALLOWED_ORIGINS`: orígenes adicionales explícitos para mutaciones administrativas, separados por comas; no se aplican al checkout público.

El formulario público requiere Origin propio o el origen canónico configurado. La identificación de IP debe provenir de cabeceras normalizadas por el proxy de confianza; validar ese comportamiento en cada despliegue.

## Capa de seguridad de rutas

Las peticiones administrativas y los checkouts públicos no aceptan cualquier valor de `Host` o `X-Forwarded-Host` como origen autorizado. El guard CSRF comprueba `Origin`, rechaza `Sec-Fetch-Site: cross-site` y sólo admite el dominio canónico y orígenes permitidos expresamente: `https://viagelato.vercel.app`, `https://viagelato-api.onrender.com`, `NEXT_PUBLIC_SITE_URL` y, para operaciones administrativas, `ADMIN_ALLOWED_ORIGINS`. El entorno de desarrollo admite `http://localhost:3000` pero producción no.

Las rutas `/api/admin/*` vuelven a comprobar la sesión y el rol de administrador en el servidor; el middleware no es la autorización definitiva. Las escrituras JSON aceptan como máximo 64 KB y sólo `application/json`; las fotos comprueban el tamaño del multipart durante la lectura antes de parsearlo y siguen validando firma JPG/PNG/WEBP. Las respuestas privadas usan cabeceras anti-cache; las páginas y API aplican `nosniff`, bloqueo de iframes, CSP básica, política de referencias y permisos de dispositivos restringidos. No se añadió `script-src` estricto, pues requeriría manejar nonces con la infraestructura de Next.

Si se despliega una **preview**, registrar su URL exacta en `ADMIN_ALLOWED_ORIGINS` sólo para pruebas internas, no usar comodines. Un error 403 de origen no se debe corregir desactivando el guard. Los límites del formulario complementan el limitador de solicitudes de WhatsApp/checkout, pero **no equivalen a un WAF** ni a protección completa contra abusos de login.

## Verificación

```text
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm audit --audit-level=moderate
```

`test:db` requiere Docker y crea/elimina una base PostgreSQL 17 descartable sin usar secretos de producción. Comprueba transacciones, RLS/permisos y concurrencia. No sustituye pruebas reales de Supabase Auth, correo o Storage. La CI ejecuta estas comprobaciones.

Ver [el informe del corte](docs/viagelato/INFORME_ESTABILIZACION_20261029.md) para hallazgos por gravedad, resultados reales, archivos y pendientes. No hay merge, aplicación de migraciones ni despliegue de producción automático en este trabajo.
