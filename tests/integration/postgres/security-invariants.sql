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
    'admin_update_whatsapp_request','admin_confirm_whatsapp_terms','admin_record_whatsapp_payment','admin_record_whatsapp_cash','admin_whatsapp_daily_summary','admin_save_store_settings') loop
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
set local role service_role;
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','contacted','90000000-0000-4000-8000-000000000001');
select public.admin_confirm_whatsapp_terms('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',true,0);
select public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','confirmed','90000000-0000-4000-8000-000000000001');
select public.admin_record_whatsapp_payment('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',50,'80000000-0000-4000-8000-000000000002','TEST');
select public.admin_record_whatsapp_payment('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',50,'80000000-0000-4000-8000-000000000002','TEST');
-- Efectivo auditado: solo después de la confirmación y sin duplicar cobros.
select public.admin_record_whatsapp_cash('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',25,'80000000-0000-4000-8000-000000000003');
select public.admin_record_whatsapp_cash('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',25,'80000000-0000-4000-8000-000000000003');
do $
declare summary jsonb;
begin
 if (select amount_paid from public.whatsapp_order_requests where id='70000000-0000-4000-8000-000000000001')<>75
 then raise exception 'Efectivo duplicado'; end if;
 if (select count(*) from public.whatsapp_request_payments where request_id='70000000-0000-4000-8000-000000000001' and payment_method='cash')<>1
 then raise exception 'Recibo en efectivo duplicado'; end if;
 summary:=public.admin_whatsapp_daily_summary((now() at time zone 'America/Argentina/Buenos_Aires')::date,'90000000-0000-4000-8000-000000000001');
 if (summary->>'confirmed_count')::int<>1 or (summary->>'cash_received')::numeric<>25
  or (summary->>'transfer_received')::numeric<>50 or (summary->>'outstanding_amount')::numeric<>25
 then raise exception 'Resumen diario incorrecto: %',summary; end if;
 begin
  perform public.admin_record_whatsapp_cash('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',26,'80000000-0000-4000-8000-000000000003');
  raise exception 'Se aceptó reutilizar clave con otro monto';
 exception when raise_exception then
  if sqlerrm='Se aceptó reutilizar clave con otro monto' then raise; end if;
 end;
 begin
  perform public.admin_whatsapp_daily_summary(current_date,gen_random_uuid());
  raise exception 'Reporte accesible sin administrador';
 exception when raise_exception then
  if sqlerrm='Reporte accesible sin administrador' then raise; end if;
 end;
end $;
do $ begin
 if (select amount_paid from public.whatsapp_order_requests where id='70000000-0000-4000-8000-000000000001')<>75 then raise exception 'Pago duplicado'; end if;
 begin perform public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','preparing','90000000-0000-4000-8000-000000000001'); raise exception 'Preparación sin pago'; exception when raise_exception then if sqlerrm='Preparación sin pago' then raise; end if; end;
 begin perform public.admin_update_whatsapp_request('70000000-0000-4000-8000-000000000001','cancel',gen_random_uuid()); raise exception 'Actor no autorizado'; exception when raise_exception then if sqlerrm='Actor no autorizado' then raise; end if; end;
end $$;
reset role;
rollback;
select 'VIAGELATO_SECURITY_TESTS_OK' as result;
