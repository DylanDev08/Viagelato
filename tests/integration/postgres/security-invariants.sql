\set ON_ERROR_STOP on
begin;

do $$
declare table_name text;
begin
 if has_column_privilege('anon','public.products','stock','select') then
  raise exception 'anon puede leer stock exacto';
 end if;
 if not has_column_privilege('anon','public.products','name','select') then
  raise exception 'anon no puede leer el nombre del catálogo';
 end if;
 if has_table_privilege('anon','public.orders','select') then
  raise exception 'anon puede leer pedidos con datos personales';
 end if;
 if has_table_privilege('authenticated','public.whatsapp_order_requests','select') then
  raise exception 'authenticated puede leer solicitudes de WhatsApp ajenas';
 end if;
 if has_function_privilege('anon','public.consume_checkout_attempt(text,uuid,integer,integer)','execute') then
  raise exception 'anon puede invocar el limitador privilegiado';
 end if;
 if has_function_privilege('authenticated','public.admin_update_whatsapp_request(uuid,text,uuid)','execute') then
  raise exception 'authenticated puede invocar una mutación administrativa';
 end if;

 foreach table_name in array array[
  'admin_users','products','categories','shipping_zones','site_settings','payment_settings',
  'banners','orders','order_items','checkout_attempts','order_audit_logs',
  'whatsapp_order_requests','whatsapp_request_events','whatsapp_request_payments'
 ] loop
  if not (select relrowsecurity from pg_class where oid=('public.'||table_name)::regclass) then
   raise exception 'RLS deshabilitada en %',table_name;
  end if;
 end loop;
end $$;

rollback;
select 'VIAGELATO_SECURITY_TESTS_OK' as result;
