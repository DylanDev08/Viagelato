# Viagelato — Estado real de Supabase y auditoría RLS

**Corte verificado:** 2026-11-02 · **Proyecto:** `Viagelato-ECommerce` (`mxopaakzlmjbnrwolpgh`) · **Entorno:** producción.

> Esta es una fotografía auditada a la fecha indicada, no una garantía permanente. Antes de desplegar cambios de base, volver a ejecutar las consultas del runbook.

## Resumen comprobado

| Control | Resultado |
| --- | --- |
| Migraciones registradas en Supabase | 10; última `20261102115243` |
| Tablas ordinarias del esquema `public` | 14; **14 con RLS habilitado** |
| Políticas de lectura públicas | 5 políticas `SELECT` restrictivas por estado comercial |
| Tablas internas sin política pública | 9; comportamiento **deny-all intencional** |
| Funciones RPC en `public` | 10; `EXECUTE` denegado a `anon` y `authenticated`, permitido a `service_role` |
| Secuencias internas de `public` | 3; sin `USAGE`/`SELECT` de `anon` y `authenticated` |
| Default privileges de objetos creados por `postgres` | Denegación por defecto para `anon`/`authenticated` en nuevos objetos de `public` |
| `storage.buckets.images` | Bucket público, límite 3.000.000 bytes, JPEG/PNG/WebP |
| Versión en GitHub al auditar | `main` `c8cef206aae96555edd7de9d2e56e36ac9de4e75` (PR #42) |
| Verificación CI | GitHub Actions run `41441120020`, segundo intento: `success` |

### Políticas públicas observadas

| Tabla | Operación permitida a `anon` / `authenticated` | Condición RLS de lectura |
| --- | --- | --- |
| `banners` | `SELECT` | `active = true` |
| `categories` | `SELECT` | `true` (catálogo de categorías públicas) |
| `products` | `SELECT` | `active = true AND commercially_verified = true AND price > 0` |
| `shipping_zones` | `SELECT` | `active = true AND ready = true AND cost IS NOT NULL` |
| `site_settings` | `SELECT` | `true` (contenido comercial público, nunca datos bancarios) |

Los usuarios públicos **no tienen permiso de escritura** sobre esas cinco tablas. La comprobación combina privilegios SQL de tabla y políticas RLS; ninguna capa sustituye a la otra.

### Tablas con denegación pública total

`admin_users`, `checkout_attempts`, `order_audit_logs`, `order_items`, `orders`, `payment_settings`, `whatsapp_order_requests`, `whatsapp_request_events` y `whatsapp_request_payments`.

Estas nueve tablas tienen RLS activado, sin políticas para clientes y sin privilegios de tabla para `anon` ni `authenticated`. La advertencia informativa del linter **RLS Enabled No Policy** es coherente con este diseño; **no crear** una política `USING (true)` para hacer desaparecer el aviso.

### Ejecución de pruebas de roles en el proyecto real

Se ejecutaron consultas como `anon` y `authenticated` dentro de transacciones terminadas con `ROLLBACK`. Se observó: 0 productos ocultos, 0 zonas inactivas y 0 banners inactivos visibles; lectura de `site_settings` permitida; lecturas directas de `orders`, `payment_settings` y `whatsapp_order_requests` denegadas; RPC privado de reservas denegado. Las secuencias privadas no conceden `USAGE` ni `SELECT`, y `service_role` conserva ejecución de los 10 RPC. Estas verificaciones son de permisos SQL, **no pruebas con JWT real, Storage ni sesión de usuario**.

## Migraciones registradas en el proyecto remoto

| Versión remota | Nombre remoto |
| --- | --- |
| `20261028133719` | `viagelato_initial_schema_20261028` |
| `20261028173154` | `viagelato_corte08_atomic_settings_and_catalog_hardening` |
| `20261029004725` | `corte04_whatsapp_requests_tracking` |
| `20261029014401` | `corte05_whatsapp_financial_control` |
| `20261029034054` | `corte06_free_shipping_enforcement` |
| `20261029144603` | `corte09_catalog_visibility` |
| `20261030002052` | `checkout_attempt_limits` |
| `20261030121104` | `viagelato_corte10_cash_and_daily_summary` |
| `20261101002614` | `viagelato_cod_financial_flow_20261031` |
| `20261102115243` | `viagelato_rls_default_grants_lockdown` |

**Importante:** el historial remoto contiene versiones cuyos archivos no están individualmente en `supabase/migrations/` de Git. El repositorio contiene además `supabase/schema.sql` y parches históricos en `supabase/patches/`, usados en pruebas descartables. No inferir que es seguro ejecutar todo ese directorio en una base existente ni marcar versiones como aplicadas sin cotejarlas.

Última migración: [`supabase/migrations/20261102115243_viagelato_rls_default_grants_lockdown.sql`](../../supabase/migrations/20261102115243_viagelato_rls_default_grants_lockdown.sql). Se aplicó en Supabase, se verificó, se versionó en la PR [#42](https://github.com/DylanDev08/Viagelato/pull/42) y pasó las pruebas PostgreSQL en contenedor descartable.

## Hallazgos pendientes — sin resolver por el corte

1. **`supabase_admin`:** sus ACL predeterminadas son gestionadas por Supabase, afectan únicamente objetos que cree ese rol y **no pueden modificarse desde `postgres`**. La migración protege objetos futuros creados por `postgres`. La consulta adicional del 02/11 encontró **0 relaciones y 0 funciones de `supabase_admin` en `public`**, y ninguna extensión listada allí. No se intentó cambiar su ACL; conservar las extensiones fuera de `public` y volver a comprobar si se instalan nuevas.
2. **Supabase Auth:** el Security Advisor advertía que **Leaked Password Protection** estaba desactivado. Configurarla desde Auth si la edición del proyecto lo permite; no se cambió Auth en este corte.
3. **Pruebas reales de usuario:** pendientes login administrativo, invitación/recuperación y operaciones completas con sesión autenticada en staging. Los tests SQL no reemplazan Auth ni una prueba end-to-end.
4. **Indexación y checkout legado:** permanecían configurados en Vercel como `ENABLE_INDEXING=false` y `ENABLE_CHECKOUT=false`. Esto no deshabilita las solicitudes por WhatsApp; no confundir ambos circuitos.

Seguimiento: [Issue #43](https://github.com/DylanDev08/Viagelato/issues/43) (ACL del rol administrado y protección de contraseñas), [Issue #40](https://github.com/DylanDev08/Viagelato/issues/40) (dependencias de desarrollo). Los índices sin uso señalados por el asesor de rendimiento son avisos informativos; no borrar índices sin verificar consultas reales.

## Evidencias y procedimientos

- CI posterior a la PR #42: [GitHub Actions run 41441120020](https://github.com/DylanDev08/Viagelato/actions/runs/41441120020) (segundo intento aprobado).
- [Runbook de migraciones, RLS y publicación](RUNBOOK_MIGRACIONES_RLS.md).
- [Documentación oficial de seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api).
- [Supabase: por qué no se pueden cambiar los default privileges de `supabase_admin`](https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema).
- [Documentación oficial de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
