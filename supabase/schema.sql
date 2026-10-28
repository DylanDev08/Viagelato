-- VIAGELATO: ejecutar únicamente en un proyecto NUEVO y exclusivo de Supabase.
create extension if not exists pgcrypto;

create table if not exists public.admin_users(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);

create table if not exists public.categories(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 100),
 slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
 description text not null default ''
);

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(),
 category_id uuid references public.categories(id) on delete set null,
 name text not null check(length(trim(name)) between 2 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
 description text not null default '',
 price numeric(12,2) not null default 0 check(price>=0),
 stock int not null default 0 check(stock>=0),
 image_url text,
 sku text unique,
 presentation text,
 featured boolean not null default false,
 commercially_verified boolean not null default false,
 active boolean not null default false,
 created_at timestamptz not null default now(),
 constraint publish_only_complete_products check(
  not active or (commercially_verified and price>0 and sku is not null and length(trim(sku))>0)
 )
);
create index if not exists products_active_idx on public.products(created_at desc) where active=true;
create index if not exists products_category_active_idx on public.products(category_id) where active=true;

create table if not exists public.shipping_zones(
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 postal_codes text[] not null default '{}',
 cost numeric(12,2) check(cost is null or cost>=0),
 free_shipping_eligible boolean not null default false,
 ready boolean not null default false,
 active boolean not null default false,
 constraint activate_only_ready_zones check(not active or (ready and cost is not null))
);

create table if not exists public.site_settings(
 id boolean primary key default true check(id=true),
 name text not null default 'Viagelato S.A.',
 description text not null default 'Logística y distribución de productos congelados.',
 logo_url text,
 whatsapp text not null default '',
 phone text not null default '1140962202',
 instagram text not null default 'https://www.instagram.com/distribuidorviagelato/',
 address text not null default '',
 maps_url text not null default '',
 contact_email text not null default '',
 hero_title text not null default 'Frío bien distribuido. Productos que llegan mejor.',
 hero_subtitle text not null default 'Logística y distribución con entregas coordinadas por zona.',
 hero_image_url text,
 returns_policy text not null default 'Pendiente de validación comercial y jurídica.',
 privacy_policy text not null default 'Pendiente de validación comercial y jurídica.',
 free_shipping_threshold numeric(12,2) not null default 60000 check(free_shipping_threshold>0),
 pickup_enabled boolean not null default false,
 transfer_enabled boolean not null default false,
 on_delivery_enabled boolean not null default false,
 reservation_minutes int not null default 30 check(reservation_minutes between 10 and 1440)
);
insert into public.site_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.payment_settings(
 id boolean primary key default true check(id=true),
 bank_alias text not null default '',
 bank_cbu text not null default '',
 bank_holder text not null default ''
);
insert into public.payment_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.banners(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 subtitle text not null default '',
 image_url text,
 href text not null default '/catalogo',
 active boolean not null default true,
 sort_order int not null default 0
);

create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(),
 idempotency_key uuid not null unique,
 request_fingerprint text not null,
 customer_name text not null,
 customer_email text not null,
 customer_phone text not null,
 address text not null default '',
 postal_code text not null default '',
 shipping_method text not null check(shipping_method in ('pickup','shipping')),
 shipping_zone_id uuid references public.shipping_zones(id) on delete set null,
 shipping_cost numeric(12,2) not null default 0,
 subtotal numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0,
 payment_method text not null check(payment_method in ('transfer','on_delivery')),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid')),
 status text not null default 'new' check(status in ('new','preparing','shipped','delivered','cancelled','expired')),
 reservation_expires_at timestamptz not null,
 stock_released_at timestamptz,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
create index if not exists orders_status_created_idx on public.orders(status,created_at desc);
create index if not exists orders_expiring_idx on public.orders(reservation_expires_at) where status='new' and payment_status='pending' and stock_released_at is null;

create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,
 unit_price numeric(12,2) not null,
 quantity int not null check(quantity>0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.checkout_attempts(
 id bigint generated always as identity primary key,
 key_hash text not null,
 idempotency_key uuid not null,
 attempted_at timestamptz not null default now(),
 unique(key_hash,idempotency_key)
);
create index if not exists checkout_attempts_window_idx on public.checkout_attempts(key_hash,attempted_at desc);

create table if not exists public.order_audit_logs(
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null,
 previous_status text,
 next_status text,
 created_at timestamptz not null default now()
);
create index if not exists order_audit_logs_order_idx on public.order_audit_logs(order_id,created_at desc);

-- RLS y permisos explícitos: obligatorio con el cambio de Data API de 2026.
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.site_settings enable row level security;
alter table public.payment_settings enable row level security;
alter table public.banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.checkout_attempts enable row level security;
alter table public.order_audit_logs enable row level security;

revoke all on public.admin_users,public.products,public.categories,public.shipping_zones,public.site_settings,public.payment_settings,public.banners,public.orders,public.order_items,public.checkout_attempts,public.order_audit_logs from anon,authenticated;
grant select on public.products,public.categories,public.shipping_zones,public.site_settings,public.banners to anon,authenticated;
grant all on public.admin_users,public.products,public.categories,public.shipping_zones,public.site_settings,public.payment_settings,public.banners,public.orders,public.order_items,public.checkout_attempts,public.order_audit_logs to service_role;
grant usage,select on all sequences in schema public to service_role;

create policy "productos publicados completos" on public.products for select to anon,authenticated using(active=true and commercially_verified=true and price>0);
create policy "categorias publicas" on public.categories for select to anon,authenticated using(true);
create policy "zonas listas" on public.shipping_zones for select to anon,authenticated using(active=true and ready=true and cost is not null);
create policy "configuracion publica" on public.site_settings for select to anon,authenticated using(true);
create policy "banners activos" on public.banners for select to anon,authenticated using(active=true);

-- Rate limit distribuido. La API envía un hash HMAC; no se persiste la IP.
create or replace function public.consume_checkout_attempt(p_key_hash text,p_idempotency_key uuid,p_limit int default 5,p_window_minutes int default 10)
returns boolean language plpgsql security invoker set search_path=public as $$
declare attempts int;
begin
 delete from public.checkout_attempts where attempted_at<now()-interval '24 hours';
 insert into public.checkout_attempts(key_hash,idempotency_key) values(p_key_hash,p_idempotency_key) on conflict do nothing;
 select count(*) into attempts from public.checkout_attempts where key_hash=p_key_hash and attempted_at>=now()-make_interval(mins=>p_window_minutes);
 return attempts<=p_limit;
end $$;

-- Libera reservas vencidas con bloqueo de filas y reposición exactamente una vez.
create or replace function public.release_expired_order_reservations(p_limit int default 100)
returns int language plpgsql security invoker set search_path=public as $$
declare candidate record; item record; released int:=0;
begin
 for candidate in
  select id from public.orders
  where status='new' and payment_status='pending' and stock_released_at is null and reservation_expires_at<=now()
  order by reservation_expires_at limit p_limit for update skip locked
 loop
  for item in select product_id,quantity from public.order_items where order_id=candidate.id and product_id is not null loop
   update public.products set stock=stock+item.quantity where id=item.product_id;
  end loop;
  update public.orders set status='expired',stock_released_at=now() where id=candidate.id and stock_released_at is null;
  if found then
   insert into public.order_audit_logs(order_id,action,previous_status,next_status) values(candidate.id,'reservation_expired','new','expired');
   released:=released+1;
  end if;
 end loop;
 return released;
end $$;

create or replace function public.reserve_order(
 p_items jsonb,p_customer_name text,p_customer_email text,p_customer_phone text,
 p_address text,p_postal_code text,p_shipping_method text,p_shipping_zone_id uuid,p_payment_method text,
 p_idempotency_key uuid,p_request_fingerprint text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare o uuid; existing record; j jsonb; prod record; qty int; price_total numeric(12,2):=0; ship numeric(12,2):=0; zid uuid:=null; cfg record; zone record;
begin
 perform public.release_expired_order_reservations(50);
 select id,total,payment_method,request_fingerprint,status into existing from public.orders where idempotency_key=p_idempotency_key for update;
 if found then
  if existing.request_fingerprint<>p_request_fingerprint then raise exception 'Clave de idempotencia reutilizada con datos diferentes'; end if;
  return jsonb_build_object('id',existing.id,'total',existing.total,'payment_method',existing.payment_method,'status',existing.status,'idempotent',true);
 end if;
 select * into cfg from public.site_settings where id=true;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>40 then raise exception 'Carrito inválido'; end if;
 if length(trim(p_customer_name))<2 or length(trim(p_customer_email))<5 or length(trim(p_customer_phone))<6 then raise exception 'Datos del comprador incompletos'; end if;
 if p_shipping_method not in ('pickup','shipping') then raise exception 'Modalidad de entrega inválida'; end if;
 if p_shipping_method='pickup' and not coalesce(cfg.pickup_enabled,false) then raise exception 'El retiro no está habilitado'; end if;
 if p_payment_method='transfer' and not coalesce(cfg.transfer_enabled,false) then raise exception 'La transferencia no está habilitada'; end if;
 if p_payment_method='on_delivery' and not coalesce(cfg.on_delivery_enabled,false) then raise exception 'El pago al recibir no está habilitado'; end if;
 if p_shipping_method='shipping' then
  if length(trim(p_address))<5 or p_shipping_zone_id is null then raise exception 'Falta dirección o zona'; end if;
  select * into zone from public.shipping_zones where id=p_shipping_zone_id and active=true and ready=true for share;
  if not found or zone.cost is null then raise exception 'Zona sin tarifa confirmada'; end if;
  zid:=zone.id;ship:=zone.cost;
  if cardinality(zone.postal_codes)>0 and not (upper(trim(p_postal_code))=any(zone.postal_codes)) then raise exception 'Código postal fuera de cobertura'; end if;
 end if;
 insert into public.orders(idempotency_key,request_fingerprint,customer_name,customer_email,customer_phone,address,postal_code,shipping_method,shipping_zone_id,payment_method,reservation_expires_at)
 values(p_idempotency_key,p_request_fingerprint,trim(p_customer_name),trim(p_customer_email),trim(p_customer_phone),coalesce(p_address,''),upper(trim(coalesce(p_postal_code,''))),p_shipping_method,zid,p_payment_method,now()+make_interval(mins=>cfg.reservation_minutes)) returning id into o;
 for j in select value from jsonb_array_elements(p_items) loop
  if not (j?'product_id' and j?'quantity') or (j->>'quantity')!~'^[0-9]{1,2}$' then raise exception 'Item inválido'; end if;
  qty:=(j->>'quantity')::int;
  if qty<1 or qty>99 then raise exception 'Cantidad no permitida'; end if;
  select id,name,price,stock into prod from public.products where id=(j->>'product_id')::uuid and active=true and commercially_verified=true and price>0 for update;
  if not found or prod.stock<qty then raise exception 'Stock insuficiente'; end if;
  update public.products set stock=stock-qty where id=prod.id;
  insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) values(o,prod.id,prod.name,prod.price,qty);
  price_total:=price_total+prod.price*qty;
 end loop;
 if p_shipping_method='shipping' and zone.free_shipping_eligible and price_total>=cfg.free_shipping_threshold then ship:=0; end if;
 update public.orders set subtotal=price_total,shipping_cost=ship,total=price_total+ship where id=o;
 insert into public.order_audit_logs(order_id,action,next_status) values(o,'created','new');
 return jsonb_build_object('id',o,'total',price_total+ship,'payment_method',p_payment_method,'status','new','idempotent',false);
end $$;

create or replace function public.admin_update_order(p_order_id uuid,p_action text,p_next_status text default null,p_actor_user_id uuid default null)
returns boolean language plpgsql security invoker set search_path=public as $$
declare st text; pay text; sm text; item record; next_st text;
begin
 select status,payment_status,shipping_method into st,pay,sm from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido inexistente'; end if;
 if p_action='mark_paid' then
  if st in ('cancelled','expired') then raise exception 'Pedido cerrado'; end if;
  if pay='paid' then return true; end if;
  update public.orders set payment_status='paid',paid_at=now() where id=p_order_id;
  insert into public.order_audit_logs(order_id,actor_user_id,action,previous_status,next_status) values(p_order_id,p_actor_user_id,'mark_paid',pay,'paid');
  return true;
 elsif p_action='cancel' then
  if st='cancelled' then return true; end if;
  if st in ('expired','delivered') or pay='paid' then raise exception 'Revisar cobro o entrega antes de cancelar'; end if;
  if (select stock_released_at is null from public.orders where id=p_order_id) then
   for item in select product_id,quantity from public.order_items where order_id=p_order_id and product_id is not null loop update public.products set stock=stock+item.quantity where id=item.product_id; end loop;
  end if;
  update public.orders set status='cancelled',stock_released_at=coalesce(stock_released_at,now()) where id=p_order_id;
  insert into public.order_audit_logs(order_id,actor_user_id,action,previous_status,next_status) values(p_order_id,p_actor_user_id,'cancel',st,'cancelled');
  return true;
 elsif p_action='set_status' then
  if st in ('cancelled','expired','delivered') then raise exception 'Pedido cerrado'; end if;
  if (st='new' and p_next_status='preparing') or (st='preparing' and p_next_status='shipped' and sm='shipping') or (st='preparing' and p_next_status='delivered' and sm='pickup') or (st='shipped' and p_next_status='delivered') then next_st:=p_next_status; else raise exception 'Transición de estado no permitida'; end if;
  update public.orders set status=next_st where id=p_order_id;
  insert into public.order_audit_logs(order_id,actor_user_id,action,previous_status,next_status) values(p_order_id,p_actor_user_id,'set_status',st,next_st);
  return true;
 end if;
 raise exception 'Acción desconocida';
end $$;

revoke all on function public.consume_checkout_attempt(text,uuid,int,int) from public,anon,authenticated;
revoke all on function public.release_expired_order_reservations(int) from public,anon,authenticated;
revoke all on function public.reserve_order(jsonb,text,text,text,text,text,text,uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_update_order(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.consume_checkout_attempt(text,uuid,int,int) to service_role;
grant execute on function public.release_expired_order_reservations(int) to service_role;
grant execute on function public.reserve_order(jsonb,text,text,text,text,text,text,uuid,text,uuid,text) to service_role;
grant execute on function public.admin_update_order(uuid,text,text,uuid) to service_role;

-- Bucket público para imágenes comerciales; carga sólo por API administrativa.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('images','images',true,3000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Cobertura conocida: inactiva, sin tarifa y no elegible hasta validación comercial.
insert into public.shipping_zones(name,postal_codes,cost,free_shipping_eligible,ready,active) values
 ('Lomas de Zamora','{}',null,false,false,false),('Lanús','{}',null,false,false,false),('Banfield','{}',null,false,false,false),
 ('Avellaneda','{}',null,false,false,false),('Valentín Alsina','{}',null,false,false,false),
 ('Don Bosco','{}',null,false,false,false),('Wilde','{}',null,false,false,false)
on conflict(name) do nothing;

-- Crear el administrador en Auth > Users y luego ejecutar:
-- insert into public.admin_users(user_id) values('UUID-DEL-USUARIO');
