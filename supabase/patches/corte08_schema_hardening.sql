-- Viagelato Corte 08: seguridad de publicación, índices de FK y configuración atómica.
-- Aplicar únicamente en proyecto mxopaakzlmjbnrwolpgh.
-- Sin activación de ventas; no se modifican productos, precios, stock ni pedidos.
begin;

alter table public.products drop constraint if exists publish_only_complete_products;
alter table public.products add constraint publish_only_complete_products
 check (not active or (
  commercially_verified = true and price > 0
  and nullif(btrim(sku),'') is not null
  and nullif(btrim(image_url),'') is not null
  and (left(image_url,10)='/catalogo/' or left(image_url,8)='https://')
  and length(btrim(description)) >= 20
 )) not valid;
alter table public.products validate constraint publish_only_complete_products;

create index if not exists order_audit_logs_actor_user_id_idx on public.order_audit_logs(actor_user_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_shipping_zone_id_idx on public.orders(shipping_zone_id);

-- Sólo service_role puede ejecutarla. Una única transacción asegura ambas filas.
create or replace function public.admin_save_store_settings(p_data jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
 v_site jsonb;
 v_payment jsonb;
begin
 if p_data is null or jsonb_typeof(p_data) <> 'object' then
  raise exception 'Configuración inválida';
 end if;

 update public.site_settings as s
 set
  name = p_data->>'name',
  description = p_data->>'description',
  whatsapp = p_data->>'whatsapp',
  phone = p_data->>'phone',
  instagram = p_data->>'instagram',
  address = p_data->>'address',
  maps_url = p_data->>'maps_url',
  contact_email = p_data->>'contact_email',
  hero_title = p_data->>'hero_title',
  hero_subtitle = p_data->>'hero_subtitle',
  returns_policy = p_data->>'returns_policy',
  privacy_policy = p_data->>'privacy_policy',
  logo_url = nullif(p_data->>'logo_url',''),
  hero_image_url = nullif(p_data->>'hero_image_url',''),
  free_shipping_threshold = (p_data->>'free_shipping_threshold')::numeric,
  reservation_minutes = (p_data->>'reservation_minutes')::integer,
  pickup_enabled = (p_data->>'pickup_enabled')::boolean,
  transfer_enabled = (p_data->>'transfer_enabled')::boolean,
  on_delivery_enabled = (p_data->>'on_delivery_enabled')::boolean
 where s.id = true
 returning to_jsonb(s) into v_site;
 if v_site is null then raise exception 'Falta configuración pública'; end if;

 update public.payment_settings as p
 set
  bank_alias = p_data->>'bank_alias',
  bank_cbu = p_data->>'bank_cbu',
  bank_holder = p_data->>'bank_holder'
 where p.id = true
 returning to_jsonb(p) into v_payment;
 if v_payment is null then raise exception 'Falta configuración de pagos'; end if;

 return v_site || v_payment;
end;
$function$;
revoke all on function public.admin_save_store_settings(jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_store_settings(jsonb) to service_role;
commit;
