-- Corte 12: catálogo comercial público sin consultas service_role.
-- MIGRACIÓN EN DOS ETAPAS: aplicar en Supabase y validar RLS ANTES de activar
-- PUBLIC_CATALOG_READ_MODEL=true en el backend. No cambia precios ni pedidos.
--
-- Se conserva public.products como única fuente de verdad: la vista es de solo
-- lectura y no duplica registros. SECURITY INVOKER usa RLS del solicitante.
-- El estado catalog_visible fue aprobado en corte 09; los productos del catálogo
-- pueden no estar activos porque el flujo mayorista consulta stock por WhatsApp.

begin;

-- El catálogo que se muestra al público tiene que estar permitido también
-- por RLS: no usar una vista con privilegios de su dueño para saltar la política.
drop policy if exists "productos publicados completos" on public.products;
create policy "productos publicados completos"
on public.products for select to anon,authenticated
using (
 (active=true and commercially_verified=true and price>0)
 or (
  catalog_visible=true
  and price>0
  and sku is not null and length(trim(sku))>0
  and slug ~ '^excel-fila-([2-9]|[1-3][0-9]|4[0-6])$'
 )
);

-- Exposición mínima: jamás devolver stock, estados internos ni registros de
-- clientes desde esta vista. No contiene URLs de tokens ni credenciales.
create or replace view public.catalog_public
with (security_invoker=true, security_barrier=true)
as
select
 slug, name, description, sku, price, presentation,
 image_url, category_id, catalog_visible
from public.products
where catalog_visible=true
 and price>0
 and sku is not null and length(trim(sku))>0
 and slug ~ '^excel-fila-([2-9]|[1-3][0-9]|4[0-6])$';

revoke all on table public.catalog_public from public,anon,authenticated;
grant select on table public.catalog_public to anon,authenticated;

-- Un índice parcial ya existe en corte 09 para catalog_visible=true.
-- No agregar otro índice redundante para 45 artículos.
commit;
