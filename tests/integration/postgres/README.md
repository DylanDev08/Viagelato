# Pruebas reales de PostgreSQL/Supabase

Estas pruebas no son mocks. Requieren una base PostgreSQL descartable con el esquema de Viagelato ya aplicado. No deben ejecutarse contra producción.

1. Crear una base temporal y aplicar `supabase/schema.sql`.
2. Aplicar, en orden alfabético, `supabase/patches/*.sql` y luego `supabase/migrations/*.sql`.
3. Ejecutar `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/checkout-invariants.sql`.
4. Ejecutar `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/security-invariants.sql`.
5. Confirmar `VIAGELATO_DB_TESTS_OK` y `VIAGELATO_SECURITY_TESTS_OK`.

Los scripts abren una transacción y hacen `rollback`: comprueban idempotencia, límites de intentos, stock, cancelación, envío gratis, bloqueos de publicación, RLS y aislamiento de columnas/datos personales sin dejar datos de prueba.
