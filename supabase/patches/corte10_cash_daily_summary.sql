-- Corte 10: pagos reales en efectivo y resumen diario administrativo.
-- Aplicar manualmente en la base Viagelato después de CI. Nunca acredita pagos automáticos.
begin;

alter table public.whatsapp_request_payments
 add column if not exists payment_method text not null default 'transfer';
alter table public.whatsapp_request_payments
 drop constraint if exists whatsapp_request_payments_method_check;
alter table public.whatsapp_request_payments
 add constraint whatsapp_request_payments_method_check
 check (payment_method in ('transfer','cash'));
create index if not exists whatsapp_request_payments_daily_method_idx
 on public.whatsapp_request_payments(created_at desc,payment_method);
create index if not exists whatsapp_request_events_daily_action_idx
 on public.whatsapp_request_events(action,created_at desc);
-- Conservar RLS y el acceso exclusivamente del service_role.
alter table public.whatsapp_request_payments enable row level security;
revoke all on public.whatsapp_request_payments from public,anon,authenticated;
grant all on public.whatsapp_request_payments to service_role;

create or replace function public.admin_record_whatsapp_cash(
 p_request_id uuid,p_actor_user_id uuid,p_amount numeric,p_payment_key uuid
) returns boolean language plpgsql security invoker set search_path=public as $$
declare
 r public.whatsapp_order_requests%rowtype;
 old_payment public.whatsapp_request_payments%rowtype;
 updated_amount numeric(12,2);
 next_payment_status text;
begin
 if p_actor_user_id is null or not exists(
  select 1 from public.admin_users where user_id=p_actor_user_id
 ) then raise exception 'No autorizado'; end if;
 if p_payment_key is null or p_amount is null or p_amount<=0 or p_amount>100000000 or scale(p_amount)>2 then
  raise exception 'Importe de efectivo inválido'; end if;

 select * into r from public.whatsapp_order_requests where id=p_request_id for update;
 if not found then return false; end if;

 select * into old_payment from public.whatsapp_request_payments where idempotency_key=p_payment_key;
 if found then
  if old_payment.request_id<>p_request_id or old_payment.amount<>p_amount or old_payment.payment_method<>'cash' then
   raise exception 'Clave reutilizada con datos diferentes'; end if;
  return true;
 end if;

 if r.status not in ('confirmed','preparing','shipped','delivered')
  or not r.stock_confirmed or r.shipping_cost is null then
  raise exception 'Primero confirmar pedido, stock y entrega'; end if;

 updated_amount:=r.amount_paid+p_amount;
 if updated_amount>r.total then raise exception 'Importe superior al saldo pendiente'; end if;

 insert into public.whatsapp_request_payments(
  request_id,idempotency_key,amount,transfer_reference,payment_method,recorded_by
 ) values(p_request_id,p_payment_key,p_amount,'','cash',p_actor_user_id);

 next_payment_status:=case when updated_amount=r.total then 'paid' else 'partial' end;
 update public.whatsapp_order_requests
 set amount_paid=updated_amount,payment_status=next_payment_status,
  paid_at=case when next_payment_status='paid' then now() else null end,
  updated_at=now()
 where id=p_request_id;

 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,'cash_received',r.payment_status,next_payment_status);
 return true;
end $$;

-- Mantener la RPC de transferencia; bloquear reutilizar claves de efectivo como transferencias.
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
 select request_id,amount,transfer_reference,payment_method into existing from public.whatsapp_request_payments
  where idempotency_key=p_payment_key;
 if found then
  if existing.request_id<>p_request_id or existing.amount<>p_amount or existing.transfer_reference<>clean_ref or existing.payment_method<>'transfer' then
   raise exception 'Idempotencia reutilizada con otros datos'; end if;
  return true;
 end if;
 if r.status not in ('confirmed','preparing','shipped','delivered') or not r.stock_confirmed or r.shipping_cost is null then
  raise exception 'Primero confirmá stock, envío y pedido'; end if;
 new_paid:=r.amount_paid+p_amount;
 if new_paid>r.total then raise exception 'La transferencia supera el saldo pendiente'; end if;
 insert into public.whatsapp_request_payments(request_id,idempotency_key,amount,transfer_reference,payment_method,recorded_by)
 values(p_request_id,p_payment_key,p_amount,clean_ref,'transfer',p_actor_user_id);
 new_state:=case when new_paid=r.total then 'paid' else 'partial' end;
 update public.whatsapp_order_requests set amount_paid=new_paid,payment_status=new_state,
  paid_at=case when new_state='paid' then now() else null end,updated_at=now()
 where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,'payment_received',r.payment_status,new_state);
 return true;
end $$;

create or replace function public.admin_whatsapp_daily_summary(
 p_day date,p_actor_user_id uuid
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 start_at timestamptz;
 end_at timestamptz;
 result jsonb;
begin
 if p_actor_user_id is null or not exists(
  select 1 from public.admin_users where user_id=p_actor_user_id
 ) then raise exception 'No autorizado'; end if;
 if p_day is null then raise exception 'Fecha requerida'; end if;
 start_at:=p_day::timestamp at time zone 'America/Argentina/Buenos_Aires';
 end_at:=(p_day+1)::timestamp at time zone 'America/Argentina/Buenos_Aires';

 with
 confirmed_ids as (
  select distinct e.request_id from public.whatsapp_request_events e
  where e.action='confirmed' and e.created_at>=start_at and e.created_at<end_at
 ),
 confirmed as (
  select r.* from public.whatsapp_order_requests r
  join confirmed_ids ids on ids.request_id=r.id
  where r.status<>'cancelled'
 ),
 payments_today as (
  select p.amount,p.payment_method from public.whatsapp_request_payments p
  where p.created_at>=start_at and p.created_at<end_at
 )
 select jsonb_build_object(
  'day',p_day,
  'prepared_count',(select count(*) from public.whatsapp_order_requests
     where created_at>=start_at and created_at<end_at),
  'confirmed_count',(select count(*) from confirmed),
  'confirmed_amount',(select coalesce(sum(total),0) from confirmed),
  'cash_received',(select coalesce(sum(amount),0) from payments_today where payment_method='cash'),
  'transfer_received',(select coalesce(sum(amount),0) from payments_today where payment_method='transfer'),
  'outstanding_amount',(select coalesce(sum(greatest(0,total-amount_paid)),0) from confirmed)
 ) into result;
 return result;
end $$;

revoke all on function public.admin_record_whatsapp_cash(uuid,uuid,numeric,uuid)
 from public,anon,authenticated;
revoke all on function public.admin_whatsapp_daily_summary(date,uuid)
 from public,anon,authenticated;
grant execute on function public.admin_record_whatsapp_cash(uuid,uuid,numeric,uuid) to service_role;
revoke all on function public.admin_record_whatsapp_payment(uuid,uuid,numeric,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_record_whatsapp_payment(uuid,uuid,numeric,uuid,text) to service_role;
grant execute on function public.admin_whatsapp_daily_summary(date,uuid) to service_role;
commit;