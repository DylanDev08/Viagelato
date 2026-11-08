# Pruebas PostgreSQL y control de RLS de Viagelato

## Prueba aislada y reproducible

Con Docker iniciado, ejecutar `npm run test:db` desde la raíz del repositorio. El runner crea PostgreSQL 17 **descartable**, sin publicar puertos ni usar secretos o información de producción. Prepara los roles mínimos `anon`, `authenticated` y `service_role`; aplica `supabase/schema.sql`, los `supabase/patches/*.sql` ordenados, y las `supabase/migrations/*.sql` ordenadas.

Ejecuta `checkout-invariants.sql`, `security-invariants.sql` y 12 peticiones concurrentes de un limitador de 3. Todo termina con `ROLLBACK` y elimina el contenedor.

La prueba RLS verifica: tablas con RLS habilitado, prohibición de leer pedidos/clientes/bancos para roles públicos, bloqueo de escrituras públicas y RPC internos, visibilidad comercial del catálogo y privacidad de borradores, idempotencia de pagos, **privacidad de las secuencias** y **default privileges del rol `postgres` para objetos futuros** (migración `20261102115243`).

Resultados esperados: `VIAGELATO_DB_TESTS_OK`, `VIAGELATO_SECURITY_TESTS_OK` y `VIAGELATO_CONCURRENT_LIMIT_OK (3/12 admitted)`.

## Límites de la simulación

El bootstrap crea un esquema mínimo de `auth.users` y `storage.buckets`, pero **no emula** Supabase Auth, invitaciones, JWT, PostgREST, Storage real, recuperación de cuenta, Vercel ni Render. Para certificar estas integraciones, efectuar pruebas en staging con un usuario de prueba. Los tests SQL no deben ejecutarse contra la base productiva.

## Ejecución manual opcional en base descartable

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/checkout-invariants.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/security-invariants.sql
```

La base debe estar previamente preparada **con todos los objetos y las migraciones compatibles**. No reutilizar `DATABASE_URL` de producción para `TEST_DATABASE_URL`.

Más información: [runbook de migraciones](../../../docs/viagelato/RUNBOOK_MIGRACIONES_RLS.md) y [auditoría del 02/11/2026](../../../docs/viagelato/ESTADO_SUPABASE_RLS_20261102.md).
