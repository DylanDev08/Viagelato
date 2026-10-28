# Migraciones propuestas (no aplicadas)

`supabase/schema.sql` queda congelado mientras se prepara la base. No se aplicó ninguna migración ni se modificó ningún proyecto Supabase.

Antes de conectar producción conviene versionar el esquema actual como migración inicial y ejecutar las pruebas de `tests/integration/postgres` en una base descartable. Las ampliaciones siguientes deben evaluarse recién con datos comerciales reales:

- galería de múltiples imágenes por producto, si una sola imagen resulta insuficiente;
- registro de comprobantes de transferencia con bucket privado y acceso temporal;
- historial editable de contenido institucional, si se necesita auditoría editorial.

No son requisitos para la conexión inicial y no deben agregarse antes de validar CRUD, autenticación, stock y pedidos reales.
