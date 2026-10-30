-- Additive: preserves existing attempts and never touches orders or stock.
begin;
-- Cover actor foreign keys flagged by the read-only Supabase performance advisor.
create index if not exists whatsapp_request_events_actor_user_id_idx on public.whatsapp_request_events(actor_user_id);
create index if not exists whatsapp_request_payments_recorded_by_idx on public.whatsapp_request_payments(recorded_by);
alter table public.checkout_attempts add column if not exists attempt_count integer not null default 1;

create or replace function public.consume_checkout_attempt(
 p_key_hash text,p_idempotency_key uuid,p_limit int default 5,p_window_minutes int default 10
) returns boolean language plpgsql security invoker set search_path=public as $$
declare attempts bigint;
begin
 if p_key_hash is null or length(p_key_hash) not between 1 and 128 or p_idempotency_key is null
  or p_limit is null or p_limit not between 1 and 100
  or p_window_minutes is null or p_window_minutes not between 1 and 60 then
  raise exception 'Parámetros de límite inválidos';
 end if;
 -- Serialize count + write for this client across concurrent server instances.
 perform pg_advisory_xact_lock(hashtextextended('checkout:'||p_key_hash,0));
 delete from public.checkout_attempts where attempted_at<now()-interval '24 hours';
 select coalesce(sum(attempt_count),0) into attempts from public.checkout_attempts
  where key_hash=p_key_hash and attempted_at>=now()-make_interval(mins=>p_window_minutes);
 if attempts>=p_limit then return false; end if;
 insert into public.checkout_attempts(key_hash,idempotency_key) values(p_key_hash,p_idempotency_key)
 on conflict(key_hash,idempotency_key) do update set
  attempt_count=case when checkout_attempts.attempted_at<now()-make_interval(mins=>p_window_minutes)
   then 1 else checkout_attempts.attempt_count+1 end,
  attempted_at=now();
 return true;
end $$;
revoke all on function public.consume_checkout_attempt(text,uuid,int,int) from public,anon,authenticated;
grant execute on function public.consume_checkout_attempt(text,uuid,int,int) to service_role;
commit;
