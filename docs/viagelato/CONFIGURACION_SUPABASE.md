# Configuración operativa de Supabase — Viagelato

**Actualizado:** 02/11/2026 · **Proyecto exclusivo:** `mxopaakzlmjbnrwolpgh` (`Viagelato-ECommerce`).

> Esta guía sustituye la puesta en marcha inicial. La base real ya existe, contiene datos comerciales y registra 10 migraciones. No crear un proyecto nuevo ni ejecutar `schema.sql` nuevamente en producción.

## Variables y aislamiento

- Vercel (app Next.js y rutas administrativas): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` son públicas; `SUPABASE_SERVICE_ROLE_KEY` es **secreta, solo servidor**. Nunca usar prefijo `NEXT_PUBLIC_` en secretos.
- `NEXT_PUBLIC_SITE_URL=https://viagelato.vercel.app` define el origen canónico. Dominios preview usados en escrituras administrativas requieren una configuración explícita y exacta de `ADMIN_ALLOWED_ORIGINS` en el entorno del servidor correspondiente; nada de comodines.
- `API_ORIGIN` se usa exclusivamente para `/api/checkout` y `/api/cron/:path*` del backend legado. **Admin y solicitudes por WhatsApp se resuelven en Vercel**, no en Render.
- `CHECKOUT_RATE_LIMIT_SALT` y `CRON_SECRET` son secretos de servidor cuando sus rutas estén activas. No publicarlos en repositorios ni logs.
- Mantener `ENABLE_CHECKOUT=false` para el checkout legado y `ENABLE_INDEXING=false` hasta aprobación del lanzamiento. El flujo actual de solicitudes se realiza mediante WhatsApp y no requiere habilitar el checkout legado.

## Estado de la base real

- Supabase registra 10 migraciones; última: `20261102115243_viagelato_rls_default_grants_lockdown` (aplicada). No es un cambio pendiente.
- 14 tablas de `public` con RLS activo. 5 tablas de catálogo/configuración tienen políticas `SELECT` con condiciones comerciales; 9 tablas internas no poseen políticas públicas (deny-all deliberado).
- 10 RPC en `public` están restringidos a `service_role`; `anon` y `authenticated` no tienen ejecución directa.
- Los permisos predeterminados de **nuevos objetos creados por `postgres`** están cerrados a roles públicos; las 3 secuencias internas existentes también.
- Bucket `images` público para servir imágenes, con límite de 3 MB y tipos JPEG/PNG/WebP; la subida del panel debe pasar por autorización del servidor.

## Operación administrativa

1. Para autorizar una cuenta administrativa: crear/invitar al usuario en Supabase Auth, identificar su UUID y añadirlo a `public.admin_users` mediante un procedimiento autorizado. Ver [admin-setup](admin-setup.md).
2. Mantener productos en borrador hasta confirmar precio, SKU, stock, presentación y fotografía; las zonas tienen tarifas y banderas de disponibilidad confirmadas.
3. Verificar el flujo vigente carrito → solicitud por WhatsApp → confirmación humana. Las transferencias y el efectivo contra entrega requieren registro administrativo: **abrir WhatsApp no confirma pago ni pedido**.
4. Para DDL, usar [runbook](RUNBOOK_MIGRACIONES_RLS.md), prueba en staging y revisión del historial remoto; no aplicar todos los parches existentes sobre producción.

## Seguridad y pendientes

- Security Advisor reporta 9 avisos informativos `rls_enabled_no_policy` de tablas privadas: no abrirlas al público para eliminarlos.
- Queda pendiente revisar permisos por defecto del rol gestionado `supabase_admin` y activar la protección de contraseñas filtradas de Supabase Auth si está disponible. Seguimiento: [Issue #43](https://github.com/DylanDev08/Viagelato/issues/43).
- Repetir las consultas y pruebas de permisos tras toda modificación de tablas, funciones, Storage o Auth.

Ver [auditoría RLS verificada](ESTADO_SUPABASE_RLS_20261102.md) y [seguridad Data API](https://supabase.com/docs/guides/api/securing-your-api).
