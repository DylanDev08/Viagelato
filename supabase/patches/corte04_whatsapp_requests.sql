-- Corte 04: solicitudes comerciales de WhatsApp; nunca son pedidos pagados ni reservas de stock.
create table if not exists public.whatsapp_order_requests (
 id uuid primary key default gen_random_uuid(),
 idempotency_key uuid not null unique,
 request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
 customer_name text not null check (length(trim(customer_name)) between 2 and 120),
 locality text not null check (length(trim(locality)) between 2 and 100),
 address text not null default '' check (length(address)<=250),
 notes text not null default '' check (length(notes)<=350),
 shipping_method text not null check (shipping_method in ('shipping','pickup')),
 items jsonb not null check (jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 30),
 subtotal numeric(12,2) not null check (subtotal>0),
 status text not null default 'draft' check (status in ('draft','contacted','confirmed','preparing','shipped','delivered','cancelled')),
 payment_status text not null default 'pending' check (payment_status in ('pending','paid')),
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_order_requests_recent_idx on public.whatsapp_order_requests(created_at desc);
create index if not exists whatsapp_order_requests_status_idx on public.whatsapp_order_requests(status,created_at desc);
create table if not exists public.whatsapp_request_events(
 id bigint generated always as identity primary key,
 request_id uuid not null references public.whatsapp_order_requests(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null,
 previous_status text,
 next_status text,
 created_at timestamptz not null default now()
);
create index if not exists whatsapp_request_events_request_idx on public.whatsapp_request_events(request_id,created_at desc);
alter table public.whatsapp_order_requests enable row level security;
alter table public.whatsapp_request_events enable row level security;
revoke all on public.whatsapp_order_requests,public.whatsapp_request_events from public,anon,authenticated;
grant all on public.whatsapp_order_requests,public.whatsapp_request_events to service_role;
grant usage,select on all sequences in schema public to service_role;

create or replace function public.admin_update_whatsapp_request(
 p_request_id uuid,p_action text,p_actor_user_id uuid
) returns boolean language plpgsql security invoker set search_path=public as $$
declare existing record; next_status text;
begin
 select status,payment_status into existing from public.whatsapp_order_requests where id=p_request_id for update;
 if not found then return false; end if;
 if p_action='mark_paid' then
  if existing.status not in ('confirmed','preparing','shipped','delivered') then raise exception 'Primero confirmá el pedido antes de acreditar pagos'; end if;
  if existing.payment_status='paid' then return true; end if;
  update public.whatsapp_order_requests set payment_status='paid',paid_at=now(),updated_at=now() where id=p_request_id;
  insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
   values(p_request_id,p_actor_user_id,'mark_paid',existing.payment_status,'paid');
  return true;
 end if;
 if p_action='cancel' then
  if existing.status='cancelled' then return true; end if;
  if existing.status='delivered' or existing.payment_status='paid' then raise exception 'Revisá entrega o devolución antes de cancelar'; end if;
  next_status:='cancelled';
 elsif p_action='contacted' and existing.status='draft' then next_status:='contacted';
 elsif p_action='confirmed' and existing.status='contacted' then next_status:='confirmed';
 elsif p_action='preparing' and existing.status='confirmed' then next_status:='preparing';
 elsif p_action='shipped' and existing.status='preparing' and
   (select shipping_method='shipping' from public.whatsapp_order_requests where id=p_request_id) then next_status:='shipped';
 elsif p_action='delivered' and
   (existing.status='shipped' or (existing.status='preparing' and
   (select shipping_method='pickup' from public.whatsapp_order_requests where id=p_request_id))) then next_status:='delivered';
 else raise exception 'Transición de solicitud no permitida'; end if;
 update public.whatsapp_order_requests set status=next_status,updated_at=now() where id=p_request_id;
 insert into public.whatsapp_request_events(request_id,actor_user_id,action,previous_status,next_status)
 values(p_request_id,p_actor_user_id,p_action,existing.status,next_status);
 return true;
end $$;
revoke all on function public.admin_update_whatsapp_request(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_whatsapp_request(uuid,text,uuid) to service_role;
