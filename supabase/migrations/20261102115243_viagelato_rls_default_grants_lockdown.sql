-- Viagelato: default-deny de privilegios en futuros objetos public.
-- No modifica tablas, filas, datos comerciales ni políticas RLS vigentes.
-- Las APIs administrativas continúan usando service_role desde servidor.

-- Suprimir permisos directos por defecto para tablas, secuencias y funciones
-- creadas por el rol postgres (rol que aplica las migraciones de la aplicación).
alter default privileges for role postgres in schema public
 revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
 revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
 revoke execute on functions from anon, authenticated, public;

-- El EXECUTE implícito de PUBLIC en funciones es global en PostgreSQL;
-- negarlo para objetos nuevos del rol postgres impide una puerta trasera.
alter default privileges for role postgres
 revoke execute on functions from public;

-- Los contadores de pedidos/eventos nunca deben ser consultables por anon/auth.
-- El código del servidor conserva los permisos existentes de service_role.
revoke all privileges on all sequences in schema public from anon, authenticated;
