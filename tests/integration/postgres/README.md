# Pruebas reales de PostgreSQL/Supabase

## Ejecución reproducible

Con Docker iniciado, ejecutar `npm run test:db`. El runner crea su propio contenedor
PostgreSQL 17 sin publicar puertos, prepara roles mínimos y aplica el esquema,
todos los parches históricos en orden y las migraciones versionadas. Ejecuta las
invariantes de checkout, aislamiento/RLS, operaciones de WhatsApp y 12 intentos
concurrentes con límite 3. El contenedor se elimina al terminar, incluso ante error.
No lee variables ni credenciales de producción.

La preparación mínima de `auth.users` y `storage.buckets` verifica PostgreSQL,
no emula Supabase Auth, envío de correos, sesiones, PostgREST ni carga de archivos.
Esos servicios requieren una prueba separada en staging.

## Ejecución manual en una base descartable preparada

Estas pruebas no son mocks. Requieren una base PostgreSQL descartable con el esquema de Viagelato ya aplicado. No deben ejecutarse contra producción.

1. Crear una base temporal y aplicar `supabase/schema.sql`, los parches de `supabase/patches` en orden y las migraciones de `supabase/migrations`.
2. Ejecutar `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/checkout-invariants.sql`.
3. Confirmar el resultado `VIAGELATO_DB_TESTS_OK`.

El script abre una transacción y hace `rollback`: comprueba idempotencia, límites de intentos, stock, cancelación, envío gratis y bloqueos de publicación sin dejar datos de prueba.
