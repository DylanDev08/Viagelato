-- Corte 01: consulta comercial independiente de la publicación con stock validado.
-- Los 45 productos de la planilla ya existen en products. No marcar active ni commercially_verified.
alter table public.products add column if not exists catalog_visible boolean not null default false;
update public.products
set catalog_visible=true
where slug ~ '^excel-fila-[0-9]+$'
  and sku is not null and length(trim(sku))>0 and price>0;
alter table public.products
  drop constraint if exists products_catalog_visible_valid;
alter table public.products
  add constraint products_catalog_visible_valid
  check (not catalog_visible or (price > 0 and nullif(btrim(sku),'') is not null));
create index if not exists products_catalog_visible_slug_idx on public.products(slug)
where catalog_visible=true;
-- No ampliamos RLS a anon/authenticated: estos borradores siguen privados.
-- El catálogo público sólo consulta columnas permitidas en componentes de servidor
-- por la service role, filtrando explícitamente catalog_visible = true.
