-- No aplicar automáticamente en producción. Revisar primero en una rama de Supabase.
begin;

-- La API pública necesita datos de catálogo, pero no el stock exacto ni banderas internas.
revoke select on table public.products from anon, authenticated;
grant select (
 id,category_id,name,slug,description,price,image_url,sku,presentation,
 featured,commercially_verified,active,created_at
) on table public.products to anon, authenticated;

-- Evita que objetos futuros queden expuestos por privilegios heredados.
alter default privileges for role postgres in schema public
 revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
 revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
 revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres
 revoke execute on functions from public;

-- Índices para las claves foráneas incorporadas por los cortes de WhatsApp.
create index if not exists whatsapp_request_events_actor_user_id_idx
 on public.whatsapp_request_events(actor_user_id);
create index if not exists whatsapp_request_payments_recorded_by_idx
 on public.whatsapp_request_payments(recorded_by);

commit;
