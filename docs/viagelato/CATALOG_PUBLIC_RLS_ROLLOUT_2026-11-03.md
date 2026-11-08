# Corte 13 — migración gradual del catálogo comercial a RLS

## Objetivo
Viagelato tiene 45 fichas comerciales marcadas `catalog_visible=true`, aunque no
se publican con la condición tradicional `active && commercially_verified`:
su venta se confirma por WhatsApp y no debemos inventar disponibilidad ni stock.

Evitar que la vista pública del catálogo necesite la clave `service_role`. Mantener
`public.products` como única fuente de verdad, sin tablas duplicadas ni triggers
de sincronización; las actualizaciones de foto y precio se reflejan inmediatamente.

## Modelo de seguridad

- Vista `public.catalog_public` con `security_invoker=true` y `security_barrier=true`.
- Columnas explícitas: nombre, slug, SKU, descripción, precio, presentación, foto,
  categoría y estado de catálogo. NO expone stock, campos de autenticación ni pagos.
- RLS base permite artículos de catálogo únicamente si `catalog_visible=true`,
  SKU no vacío, precio positivo y referencia de planilla válida (`excel-fila-2…46`).
  Conserva la política anterior para productos tradicionales activos y verificados.
- `anon` y `authenticated`: `SELECT` únicamente sobre la vista; sin escritura.
  **Nota:** la política adicional también permite leer esas filas comerciales desde
  `public.products`, cuya lectura pública ya estaba autorizada con `SELECT`.
  Esa tabla contiene campos comerciales de productos (incluyendo stock y flags de
  publicación), no credenciales ni datos de clientes. Si más adelante se necesitan
  columnas estrictamente privadas, habrá que aislarlas en otra tabla antes de
  incorporarlas a `products`.
- Ninguna función `SECURITY DEFINER` añadida, ni permisos sobre tablas de pedidos.
- Pruebas RLS reales en PostgreSQL 17 para borradores, catálogo, escritura, precios
  y ocultamiento de productos.

## Orden de despliegue: obligatorio

1. Mantener `PUBLIC_CATALOG_READ_MODEL=false` o sin configurar en Vercel.
   El código anterior lee el catálogo con credencial de servidor, como hoy.
2. Esperar que pasen lint, typecheck, tests y los tests PostgreSQL de la PR.
3. Aplicar exclusivamente la migración
   `supabase/migrations/20261103202700_catalog_public_invoker.sql` al proyecto
   **Viagelato** desde un proceso de migración controlado. Es una modificación
   de permisos públicos: requiere revisión antes del despliegue.
4. En Supabase confirmar:
   - `select count(*) from public.catalog_public;` → coincidir con los artículos
     `excel-fila-2..46` visibles y válidos.
   - Con `SET LOCAL ROLE anon`, la vista se puede consultar y los borradores no;
     no existen permisos `INSERT/UPDATE/DELETE`.
   - Las tablas `whatsapp_order_requests`, `orders`, `payment_settings` y
     `admin_users` siguen sin grants de lectura pública.
5. Desplegar el frontend con la PR aprobada. Al inicio conserva la ruta antigua.
6. Activar `PUBLIC_CATALOG_READ_MODEL=true` en Vercel, redeploy y verificar
   catálogo, detalle, filtros, carrito, pedidos WhatsApp y cambios desde admin.
   Ante error, revertir el flag a `false`; no modificar RLS de pedidos.
7. Cuando se compruebe la estabilidad, una futura PR podrá eliminar el fallback
   privilegiado del catálogo.

## Consultas y plan gratuito

Las consultas de la vista leen la tabla original, conservan índices y políticas,
no añaden jobs, copias ni procesos de sincronización. La vista devuelve 45 filas
pequeñas y no utiliza un caché compartido para precios o pedidos. El precio se
vuelve a validar en el servidor al generar WhatsApp. Para escalar, medir
latencia, egress y resultados por consulta antes de introducir caché persistente.

## Restricciones de este corte

No aplicar SQL de producción sin validar pruebas. No hacer merge de la PR
independientemente de la PR #55: este corte está apilado sobre ella. No habilitar
SEO (`ENABLE_INDEXING`) ni checkout legado por esta tarea.
