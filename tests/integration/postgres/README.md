# Pruebas reales de PostgreSQL/Supabase

Estas pruebas no son mocks. Requieren una base PostgreSQL descartable con el esquema de Viagelato ya aplicado. No deben ejecutarse contra producción.

1. Crear una base temporal y aplicar `supabase/schema.sql`.
2. Ejecutar `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/postgres/checkout-invariants.sql`.
3. Confirmar el resultado `VIAGELATO_DB_TESTS_OK`.

El script abre una transacción y hace `rollback`: comprueba idempotencia, límites de intentos, stock, cancelación, envío gratis y bloqueos de publicación sin dejar datos de prueba.
