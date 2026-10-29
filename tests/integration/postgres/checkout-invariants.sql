\set ON_ERROR_STOP on
begin;
update public.site_settings set transfer_enabled=true,on_delivery_enabled=true,pickup_enabled=false,reservation_minutes=30 where id=true;
insert into public.categories(id,name,slug) values('20000000-0000-4000-8000-000000000001','Prueba','prueba');
insert into public.products(id,category_id,name,slug,description,price,stock,image_url,sku,commercially_verified,active)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Producto probado','producto-probado','Producto completo para pruebas de integración.',60000,2,'/catalogo/alfajor-negro.webp','TEST-001',true,true);
insert into public.shipping_zones(id,name,cost,free_shipping_eligible,ready,active)
values('30000000-0000-4000-8000-000000000001','Zona probada',5000,true,true,true);

do $$
declare first_order jsonb; repeated jsonb; second_order jsonb; current_stock int; allowed boolean; i int;
begin
 for i in 1..5 loop
  select public.consume_checkout_attempt('test-hash',('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,5,10) into allowed;
  if not allowed then raise exception 'rate limit rechazó antes del límite'; end if;
 end loop;
 select public.consume_checkout_attempt('test-hash','40000000-0000-4000-8000-000000000006',5,10) into allowed;
 if allowed then raise exception 'rate limit no rechazó el sexto intento'; end if;

 select public.reserve_order('[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]','Cliente Uno','uno@example.com','1140000000','Calle 123','1832','shipping','30000000-0000-4000-8000-000000000001','transfer','50000000-0000-4000-8000-000000000001','fingerprint-a') into first_order;
 if (first_order->>'total')::numeric<>60000 then raise exception 'envío gratis elegible mal calculado'; end if;
 select public.reserve_order('[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]','Cliente Uno','uno@example.com','1140000000','Calle 123','1832','shipping','30000000-0000-4000-8000-000000000001','transfer','50000000-0000-4000-8000-000000000001','fingerprint-a') into repeated;
 if not (repeated->>'idempotent')::boolean or repeated->>'id'<>first_order->>'id' then raise exception 'idempotencia falló'; end if;
 select stock into current_stock from public.products where id='10000000-0000-4000-8000-000000000001';
 if current_stock<>1 then raise exception 'reintento descontó stock otra vez'; end if;

 select public.reserve_order('[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]','Cliente Dos','dos@example.com','1140000001','Calle 124','1832','shipping','30000000-0000-4000-8000-000000000001','on_delivery','50000000-0000-4000-8000-000000000002','fingerprint-b') into second_order;
 begin
  perform public.reserve_order('[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]','Cliente Tres','tres@example.com','1140000002','Calle 125','1832','shipping','30000000-0000-4000-8000-000000000001','transfer','50000000-0000-4000-8000-000000000003','fingerprint-c');
  raise exception 'se permitió stock negativo';
 exception when others then if sqlerrm='se permitió stock negativo' then raise; end if; end;

 perform public.admin_update_order((first_order->>'id')::uuid,'cancel',null,null);
 perform public.admin_update_order((first_order->>'id')::uuid,'cancel',null,null);
 select stock into current_stock from public.products where id='10000000-0000-4000-8000-000000000001';
 if current_stock<>1 then raise exception 'cancelación repetida repuso stock incorrectamente'; end if;
 perform public.admin_update_order((second_order->>'id')::uuid,'cancel',null,null);
 select stock into current_stock from public.products where id='10000000-0000-4000-8000-000000000001';
 if current_stock<>2 then raise exception 'cancelación no repuso stock'; end if;
end $$;

do $$ begin
 begin insert into public.products(name,slug,price,stock,active,commercially_verified) values('Incompleto','incompleto',0,0,true,false);raise exception 'se publicó producto incompleto';exception when check_violation then null;end;
 begin insert into public.shipping_zones(name,cost,ready,active) values('Sin tarifa',null,false,true);raise exception 'se activó zona sin tarifa';exception when check_violation then null;end;
end $$;
rollback;
select 'VIAGELATO_DB_TESTS_OK' as result;
