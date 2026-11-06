\set ON_ERROR_STOP on
begin;
insert into public.categories(id,name,slug) values('20000000-0000-4000-8000-000000000010','Seguridad','seguridad');
insert into public.products(name,slug,price,stock,sku,description,image_url,commercially_verified,active)
 values('Producto público','publico-seguridad',100,2,'PUBLIC-TEST','Descripción comercial verificada en prueba.','/catalogo/test.webp',true,true),
 ('Producto privado','privado-seguridad',100,0,'PRIVATE-TEST','','',false,false);
insert into auth.users(id) values('90000000-0000-4000-8000-000000000001');
insert into public.admin_users(user_id) values('90000000-0000-4000-8000-000000000001');

do $$ declare r record; role_name text; table_name text; allowed boolean;
begin
 for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity loop
  raise exception 'RLS desactivada en %',r.relname;
 end loop;
 foreach role_name in array array['anon','authenticated'] loop
  foreach table_name in array array['orders','order_items','admin_users','payment_settings','checkout_attempts',
   'order_audit_logs','whatsapp_order_requests','whatsapp_request_events','whatsapp_request_payments'] loop
   if has_table_privilege(role_name,'public.'||table_name,'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Permiso privado concedido a % en %',role_name,table_name;
   end if;
  end loop;
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in ('reserve_order','consume_checkout_attempt','admin_update_order',
    'admin_update_whatsapp_request','admin_confirm_whatsapp_terms','admin_record_whatsapp_payment','admin_save_store_settings') loop
   if has_function_privilege(role_name,r.oid,'EXECUTE') then raise exception 'RPC privada expuesta a %',role_name; end if;
  end loop;
 end loop;
 -- Reusing a UUID must still consume attempts.
 for i in 1..3 loop
  if not public.consume_checkout_attempt('repeat-security','80000000-0000-4000-8000-000000000001',3,10) then raise exception 'Límite prematuro'; end if;
 end loop;
 if public.consume_checkout_attempt('repeat-security','80000000-0000-4000-8000-000000000001',3,10) then raise exception 'Reintento ilimitado'; end if;
 update public.checkout_attempts set attempted_at=now()-interval '11 minutes' where key_hash='repeat-security';
 if not public.consume_checkout_attempt('repeat-security','80000000-0000-4000-8000-000000000001',3,10) then raise exception 'Ventana no se recupera'; end if;
end $$;


-- Future application objects must not inherit unauthenticated data privileges.
do $$
declare r record; role_name text;
begin
 if exists(
  select 1 from pg_default_acl d
  cross join lateral aclexplode(d.defaclacl) acl
  where d.defaclrole='postgres'::regrole
   and ((d.defaclnamespace='public'::regnamespace and d.defaclobjtype in ('r','S','f'))
    or (d.defaclnamespace=0 and d.defaclobjtype='f'))
   and (acl.grantee=0 or acl.grantee in ('anon'::regrole,'authenticated'::regrole))
 ) then raise exception 'Permisos públicos predeterminados peligrosos en public'; end if;
 for r in select c.oid,c.relname from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='S' loop
  foreach role_name in array array['anon','authenticated'] loop
   if has_sequence_privilege(role_name,r.oid,'USAGE')
    or has_sequence_privilege(role_name,r.oid,'SELECT')
    or has_sequence_privilege(role_name,r.oid,'UPDATE') then
    raise exception 'Secuencia privada % accesible por %',r.relname,role_name;
   end if;
  end loop;
 end loop;
end $$;

set local role anon;
do $$ begin
 if (select count(*) from public.products where slug='publico-seguridad')<>1 then raise exception 'Producto público invisible'; end if;
 if exists(select 1 from public.products where slug='privado-seguridad') then raise exception 'Filtración de borrador'; end if;
 begin perform * from public.whatsapp_order_requests; raise exception 'Filtración de clientes'; exception when insufficient_privilege then null; end;
 begin update public.products set price=1 where slug='publico-seguridad'; raise exception 'Escritura pública'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.products where slug='privado-seguridad') then raise exception 'Borrador visible a usuario'; end if;
 begin perform * from public.payment_settings; raise exception 'Filtración bancaria'; exception when insufficient_privilege then null; end;
 begin perform public.consume_checkout_attempt('x',gen_random_uuid(),3,10); raise exception 'RPC expuesta'; exception when insufficient_privilege then null; end;
end $$;
reset role;

insert into public.whatsapp_order_requests(id,idempotency_key,request_fingerprint,customer_name,locality,shipping_method,items,subtotal)
 values('70000000-0000-4000-8000-000000000001',gen_random_uuid(),repeat('a',64),'Cliente de prueba','Lanús','shipping','[{"name":"Prueba","quantity":1,"price":100}]',100);
-- Cotización fuera de cobertura mal marcada elegible: no debe regalar envío.
insert into public.shipping_zones(id,name,cost,free_shipping_eligible,ready,active)
 values('30000000-0000-4000-8000-000000000099','Quilmes Oeste',7000,true,true,true);
insert into public.whatsapp_order_requests(id,idempotency_key,request_fingerprint,customer_name,locality,shipping_method,items,subtotal)
 values('70000000-0000-4000-8000-000000000002',gen_random_uuid(),repeat('b',64),'Cotización externa','Quilmes Oeste','shipping','[{"name":"Prueba","quantity":1,"price":65000}]',65000),
       ('70000000-0000-4000-8000-000000000003',gen_random_uuid(),repeat('c',64),'Normalización tildes','LANUS','shipping','[{"name":"Prueba","quantity":1,"price":65000}]',65000);
set local role service_role;
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000002','contacted','90000000-0000-4000-8000-000000000001');
select public.admin_confirm_whatsapp_terms('70000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001',true,7000);
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000003','contacted','90000000-0000-4000-8000-000000000001');
do $ declare gratuidad_cumplida boolean := false; begin
 begin perform public.admin_confirm_whatsapp_terms('70000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001',true,7000);
 exception when others then
  if sqlerrm like 'Este pedido alcanza envío gratuito:%' then gratuidad_cumplida:=true; else raise; end if;
 end;
 if not gratuidad_cumplida then raise exception 'La RPC permitió cobrar el envío gratis a LANUS'; end if;
end $;
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','contacted','90000000-0000-4000-8000-000000000001');
select public.admin_confirm_whatsapp_terms('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',true,0);
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','confirmed','90000000-0000-4000-8000-000000000001');
select public.admin_record_whatsapp_payment('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',50,'80000000-0000-4000-8000-000000000002','TEST');
select public.admin_record_whatsapp_payment('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',50,'80000000-0000-4000-8000-000000000002','TEST');
do $$ begin
 if (select amount_paid from public.whatsapp_order_requests where id='70000000-0000-4000-8000-000000000001')<>50 then raise exception 'Pago duplicado'; end if;
 begin perform public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','preparing','90000000-0000-4000-8000-000000000001'); raise exception 'Preparación sin pago'; exception when raise_exception then if sqlerrm='Preparación sin pago' then raise; end if; end;
 begin perform public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','cancel',gen_random_uuid()); raise exception 'Actor no autorizado'; exception when raise_exception then if sqlerrm='Actor no autorizado' then raise; end if; end;
end $$;
reset role;
rollback;
select 'VIAGELATO_SECURITY_TESTS_OK' as result;
