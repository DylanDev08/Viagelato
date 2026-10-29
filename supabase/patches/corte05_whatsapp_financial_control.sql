-- Viagelato Corte 05: control comercial y comprobación de transferencias por WhatsApp.
-- No reserva stock ni inicia cobros. Todas las mutaciones son exclusivas de service_role.
alter table public.whatsapp_order_requests
 add column if not exists stock_confirmed boolean not null default false,
 add column if not exists shipping_cost numeric(12,2),
 add column if not exists amount_paid numeric(12,2) not null default 0;
alter table public.whatsapp_order_requests
 add column if not exists total numeric(12,2) generated always as (subtotal+shipping_cost) stored;
alter table public.whatsapp_order_requests
 drop constraint if exists whatsapp_order_requests_payment_status_check;
alter table public.whatsapp_order_requests
 add constraint whatsapp_request_payment_status_check check(payment_status in ('pending','partial','paid')),
 add constraint whatsapp_request_shipping_cost_check check(shipping_cost is null or (shipping_cost>=0 and shipping_cost<=10000000)),
 add constraint whatsapp_request_paid_amount_check check(amount_paid>=0 and (shipping_cost is null and amount_paid=0 or shipping_cost is not null and amount_paid<=subtotal+shipping_cost)),
 add constraint whatsapp_request_pickup_shipping_check check(shipping_method<>'pickup' or shipping_cost is null or shipping_cost=0);

create table if not exists public.whatsapp_request_payments(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.whatsapp_order_requests(id) on delete restrict,
 idempotency_key uuid not null unique,
 amount numeric(12,2) not null check(amount>0 and amount<=100000000),
 transfer_reference text not null default '' check(length(transfer_reference)<=100),
 recorded_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists whatsapp_request_payments_request_idx on public.whatsapp_request_payments(request_id,created_at desc);
create unique index if not exists whatsapp_request_payments_bank_ref_idx on public.whatsapp_request_payments(request_id,transfer_reference) where transfer_reference<>'';
alter table public.whatsapp_request_payments enable row level security;
revoke all on public.whatsapp_request_payments from public,anon,authenticated;
grant all on public.whatsapp_request_payments to service_role;

create or replace function public.admin_confirm_whatsapp_terms(
 p_request_id uuid,p_actor_user_id uuid,p_stock_confirmed boolean,p_shipping_cost numeric
) returns boolean language plpgsql security invoker set search_path=public as $$
declare old_row public.whatsapp_order_requests%rowtype;
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
 update public.whatsapp_order_requests set stock_confirmed=true,shipping_cost=p_shipping_cost,updated_at=now()
 where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,'terms_confirmed',old_row.status,old_row.status);
 return true;
end $$;

create or replace function public.admin_record_whatsapp_payment(
 p_request_id uuid,p_actor_user_id uuid,p_amount numeric,p_payment_key uuid,p_transfer_reference text default ''
) returns boolean language plpgsql security invoker set search_path=public as $$
declare r public.whatsapp_order_requests%rowtype; existing record; new_paid numeric(12,2); new_state text; clean_ref text;
begin
 if p_actor_user_id is null or not exists(select 1 from public.admin_users where user_id=p_actor_user_id) then raise exception 'No autorizado'; end if;
 if p_payment_key is null or p_amount is null or p_amount<=0 or p_amount>100000000 or scale(p_amount)>2 then
  raise exception 'Importe de transferencia inválido'; end if;
 clean_ref:=trim(coalesce(p_transfer_reference,''));
 if length(clean_ref)>100 then raise exception 'Referencia demasiado extensa'; end if;
 select * into r from public.whatsapp_order_requests where id=p_request_id for update;
 if not found then return false; end if;
 select request_id,amount,transfer_reference into existing from public.whatsapp_request_payments
  where idempotency_key=p_payment_key;
 if found then
  if existing.request_id<>p_request_id or existing.amount<>p_amount or existing.transfer_reference<>clean_ref then
   raise exception 'Idempotencia reutilizada con otros datos'; end if;
  return true;
 end if;
 if r.status not in ('confirmed','preparing','shipped','delivered') or not r.stock_confirmed or r.shipping_cost is null then
  raise exception 'Primero confirmá stock, envío y pedido'; end if;
 new_paid:=r.amount_paid+p_amount;
 if new_paid>r.total then raise exception 'La transferencia supera el saldo pendiente'; end if;
 insert into public.whatsapp_request_payments(request_id,idempotency_key,amount,transfer_reference,recorded_by)
 values(p_request_id,p_payment_key,p_amount,clean_ref,p_actor_user_id);
 new_state:=case when new_paid=r.total then 'paid' else 'partial' end;
 update public.whatsapp_order_requests set amount_paid=new_paid,payment_status=new_state,
  paid_at=case when new_state='paid' then now() else null end,updated_at=now()
 where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,'payment_received',r.payment_status,new_state);
 return true;
end $$;

create or replace function public.admin_update_whatsapp_request(
 p_request_id uuid,p_action text,p_actor_user_id uuid
) returns boolean language plpgsql security invoker set search_path=public as $$
declare r public.whatsapp_order_requests%rowtype; next_status text;
begin
 if p_actor_user_id is null or not exists(select 1 from public.admin_users where user_id=p_actor_user_id) then raise exception 'No autorizado'; end if;
 select * into r from public.whatsapp_order_requests where id=p_request_id for update;
 if not found then return false; end if;
 if p_action='mark_paid' then raise exception 'Usá Registrar transferencia con el importe acreditado'; end if;
 if p_action='cancel' then
  if r.status='cancelled' then return true; end if;
  if r.status='delivered' or r.amount_paid>0 then raise exception 'Revisá las devoluciones antes de cancelar'; end if;
  next_status:='cancelled';
 elsif p_action='contacted' and r.status='draft' then next_status:='contacted';
 elsif p_action='confirmed' and r.status='contacted' then
  if not r.stock_confirmed or r.shipping_cost is null then raise exception 'Falta confirmar stock o costo de envío'; end if;
  next_status:='confirmed';
 elsif p_action='preparing' and r.status='confirmed' then
  if r.payment_status<>'paid' or r.amount_paid<>r.total then raise exception 'Falta acreditar el pago completo'; end if;
  next_status:='preparing';
 elsif p_action='shipped' and r.status='preparing' and r.shipping_method='shipping' then next_status:='shipped';
 elsif p_action='delivered' and (r.status='shipped' or (r.status='preparing' and r.shipping_method='pickup')) then next_status:='delivered';
 else raise exception 'Transición de solicitud no permitida'; end if;
 update public.whatsapp_order_requests set status=next_status,updated_at=now() where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,p_action,r.status,next_status);
 return true;
end $$;
revoke all on function public.admin_confirm_whatsapp_terms(uuid,uuid,boolean,numeric) from public,anon,authenticated;
revoke all on function public.admin_record_whatsapp_payment(uuid,uuid,numeric,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_update_whatsapp_request(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_confirm_whatsapp_terms(uuid,uuid,boolean,numeric) to service_role;
grant execute on function public.admin_record_whatsapp_payment(uuid,uuid,numeric,uuid,text) to service_role;
grant execute on function public.admin_update_whatsapp_request(uuid,text,uuid) to service_role;
