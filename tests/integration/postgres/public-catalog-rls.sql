\set ON_ERROR_STOP on
-- Integración real con Postgres 17, roles anon/authenticated y RLS.
-- Todo ocurre en una transacción temporal; NO afecta producción.
begin;

insert into public.categories(id,name,slug)
 values('20000000-0000-4000-8000-000000000099','Palitos de prueba','palitos-prueba');

insert into public.products(
 id,category_id,name,slug,description,price,stock,sku,presentation,
 commercially_verified,active,catalog_visible
) values
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000099',
  'Seitu catalogado','excel-fila-2','Caja de 24',12500,0,'TEST-CAT-2','Caja x24',false,false,true),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000099',
  'Borrador reservado','excel-fila-3','NO PUBLICAR',20000,0,'TEST-CAT-3','Caja x24',false,false,false),
 ('30000000-0000-4000-8000-000000000047','20000000-0000-4000-8000-000000000099',
  'Producto fuera de planilla','excel-fila-47','NO PUBLICAR',30000,0,'TEST-CAT-47','Caja x12',false,false,true);

-- Aserciones de esquema. No permitimos una vista SECURITY DEFINER accidental.
do $$
begin
 if not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='catalog_public' and c.relkind='v'
   and 'security_invoker=true'=any(coalesce(c.reloptions,array[]::text[]))
 ) then raise exception 'Vista de catálogo sin security_invoker=true'; end if;
 if exists (
  select 1 from information_schema.columns
   where table_schema='public' and table_name='catalog_public'
    and column_name in ('stock','active','commercially_verified','created_at','amount_paid','notes')
 ) then raise exception 'La vista expone columnas no comerciales'; end if;
 if not (select relrowsecurity from pg_class where oid='public.products'::regclass)
  then raise exception 'RLS de products deshabilitada'; end if;
end $$;

set local role anon;
do $$
begin
 if (select count(*) from public.catalog_public where slug='excel-fila-2')<>1
  then raise exception 'Artículo comercial no accesible con clave pública'; end if;
 if exists (select 1 from public.catalog_public where slug in ('excel-fila-3','excel-fila-47'))
  then raise exception 'Filtración de borradores o referencias externas'; end if;
 if (select price from public.catalog_public where slug='excel-fila-2')<>12500
  then raise exception 'Precio del catálogo no coincide con products'; end if;
 if exists (select 1 from public.products where slug='excel-fila-3')
  then raise exception 'Borrador de products accesible por anon'; end if;
 begin
  update public.catalog_public set price=1 where slug='excel-fila-2';
  raise exception 'Se permitió escritura pública';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

set local role authenticated;
do $$
begin
 if (select count(*) from public.catalog_public where slug='excel-fila-2')<>1
  then raise exception 'Catálogo inaccesible por authenticated'; end if;
 if exists (select 1 from public.catalog_public where slug='excel-fila-3')
  then raise exception 'Borrador accesible por authenticated'; end if;
end $$;
reset role;

-- Edición de producto en la fuente de verdad debe reflejarse en la vista sin
-- triggers, jobs, tablas duplicadas ni invalidación manual de caché.
update public.products
 set price=13900,image_url='/catalogo/catalogo-test.webp'
 where slug='excel-fila-2';

set local role anon;
do $$
begin
 if (select price from public.catalog_public where slug='excel-fila-2')<>13900
  then raise exception 'Precio desactualizado en vista'; end if;
 if (select image_url from public.catalog_public where slug='excel-fila-2')<>'/catalogo/catalogo-test.webp'
  then raise exception 'Imagen desactualizada en vista'; end if;
end $$;
reset role;

update public.products set catalog_visible=false where slug='excel-fila-2';
set local role anon;
do $$
begin
 if exists (select 1 from public.catalog_public where slug='excel-fila-2')
  then raise exception 'Ocultar producto no lo retira del catálogo'; end if;
 if has_table_privilege('anon','public.catalog_public','INSERT,UPDATE,DELETE')
  then raise exception 'La vista admite escritura pública'; end if;
end $$;
reset role;

rollback;
select 'VIAGELATO_PUBLIC_CATALOG_RLS_OK' as result;
