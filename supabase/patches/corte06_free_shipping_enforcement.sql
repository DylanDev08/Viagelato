-- Corte 06: promoción de envío gratuito contractual.
-- Se respeta el umbral de site_settings y la elegibilidad de la localidad en shipping_zones.
create or replace function public.admin_confirm_whatsapp_terms(
 p_request_id uuid,p_actor_user_id uuid,p_stock_confirmed boolean,p_shipping_cost numeric
) returns boolean language plpgsql security invoker set search_path=public as $$
declare old_row public.whatsapp_order_requests%rowtype;
declare min_gratis numeric(12,2);
declare zona_gratis boolean;
begin
 if p_actor_user_id is null or not exists(select 1 from public.admin_users where user_id=p_actor_user_id) then
  raise exception 'No autorizado'; end if;
 select * into old_row from public.whatsapp_order_requests where id=p_request_id for update;
 if not found then return false; end if;
 if old_row.status not in ('contacted','confirmed') then raise exception 'Primero confirmá el contacto'; end if;
 if old_row.amount_paid>0 then raise exception 'No se pueden cambiar condiciones después de recibir pagos'; end if;
 if not coalesce(p_stock_confirmed,false) then raise exception 'La disponibilidad debe verificarse antes de confirmar'; end if;
 if p_shipping_cost is null or p_shipping_cost<0 or p_shipping_cost>10000000 or scale(p_shipping_cost)>2 then
  raise exception 'Costo de envío inválido'; end if;
 if old_row.shipping_method='pickup' and p_shipping_cost<>0 then raise exception 'El retiro debe tener costo de envío cero'; end if;
 if old_row.shipping_method='shipping' then
  select free_shipping_threshold into min_gratis from public.site_settings where id=true;
  select exists(select 1 from public.shipping_zones
   where lower(trim(name))=lower(trim(old_row.locality)) and free_shipping_eligible=true)
   into zona_gratis;
  if zona_gratis and old_row.subtotal>=coalesce(min_gratis,60000) and p_shipping_cost<>0 then
   raise exception 'Este pedido alcanza envío gratuito: el costo de envío debe ser cero'; end if;
 end if;
 update public.whatsapp_order_requests set stock_confirmed=true,shipping_cost=p_shipping_cost,updated_at=now()
 where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,'terms_confirmed',old_row.status,old_row.status);
 return true;
end $$;
revoke all on function public.admin_confirm_whatsapp_terms(uuid,uuid,boolean,numeric) from public,anon,authenticated;
grant execute on function public.admin_confirm_whatsapp_terms(uuid,uuid,boolean,numeric) to service_role;
