-- M5: Provider-neutral commerce and entitlement foundation.
--
-- Public streaming, Library presentation, commercial offers, money movement,
-- and access rights are separate concepts. This migration activates only free
-- Library offers. Download and physical offers are created as drafts until the
-- operating model and verified payment provider are approved.

create table public.catalog_offers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  code text not null,
  offer_type text not null check (offer_type in ('library_access', 'digital_download', 'physical_purchase', 'support')),
  title text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  fulfillment_type text not null check (fulfillment_type in ('entitlement', 'physical', 'none')),
  quantity_limit integer check (quantity_limit is null or quantity_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, code),
  constraint catalog_offers_window_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index catalog_offers_public_idx
  on public.catalog_offers(item_id, status, offer_type, price_cents);

comment on table public.catalog_offers is
  'A separately purchasable or free option for an Item. Item identity and public streaming do not depend on an offer.';

create table public.offer_entitlements (
  offer_id uuid not null references public.catalog_offers(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('library_access', 'download', 'read', 'launch', 'bonus_content')),
  created_at timestamptz not null default now(),
  primary key (offer_id, entitlement_type)
);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'paid', 'fulfilled', 'canceled', 'failed', 'partially_refunded', 'refunded', 'legacy_unverified')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  provider text,
  provider_order_id text,
  idempotency_key text not null default gen_random_uuid()::text,
  placed_at timestamptz,
  paid_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (provider, provider_order_id)
);

create index commerce_orders_buyer_idx on public.commerce_orders(buyer_id, created_at desc);

create table public.commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  seller_id uuid references public.profiles(id) on delete set null,
  item_title text not null,
  offer_title text not null,
  offer_type text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  fulfillment_status text not null default 'not_required' check (fulfillment_status in ('not_required', 'pending', 'in_progress', 'fulfilled', 'canceled', 'returned')),
  created_at timestamptz not null default now()
);

create index commerce_order_items_order_idx on public.commerce_order_items(order_id);
create index commerce_order_items_seller_idx on public.commerce_order_items(seller_id, created_at desc);

create table public.commerce_order_addresses (
  order_id uuid primary key references public.commerce_orders(id) on delete cascade,
  recipient_name text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code text not null,
  delivery_notes text,
  created_at timestamptz not null default now()
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  idempotency_key text not null,
  status text not null default 'created' check (status in ('created', 'pending', 'requires_action', 'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  succeeded_at timestamptz,
  unique (provider, provider_payment_id),
  unique (provider, idempotency_key)
);

create index payment_attempts_order_idx on public.payment_attempts(order_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  order_id uuid references public.commerce_orders(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  unique (provider, provider_event_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('library_access', 'download', 'read', 'launch', 'bonus_content')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  source_type text not null check (source_type in ('free_offer', 'order', 'manual_grant', 'achievement', 'legacy_library', 'admin')),
  source_id uuid,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id, entitlement_type),
  constraint entitlements_expiration_check check (expires_at is null or expires_at > granted_at)
);

create index entitlements_user_active_idx on public.entitlements(user_id, status, item_id);
create index entitlements_item_idx on public.entitlements(item_id, entitlement_type, status);

comment on table public.entitlements is
  'Server-authoritative access rights. Library entries are presentation state and are not proof of payment.';

create table public.entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  entitlement_type text not null,
  operation text not null check (operation in ('grant', 'revoke', 'expire', 'restore')),
  source_type text not null,
  source_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index entitlement_events_user_idx on public.entitlement_events(user_id, created_at desc);
create index entitlement_events_entitlement_idx on public.entitlement_events(entitlement_id, created_at desc);

create trigger catalog_offers_touch_updated_at before update on public.catalog_offers
for each row execute function public.touch_content_updated_at();
create trigger commerce_orders_touch_updated_at before update on public.commerce_orders
for each row execute function public.touch_content_updated_at();
create trigger payment_attempts_touch_updated_at before update on public.payment_attempts
for each row execute function public.touch_content_updated_at();
create trigger entitlements_touch_updated_at before update on public.entitlements
for each row execute function public.touch_content_updated_at();

-- Current operating state: all qualifying published Items retain a free Library
-- save. This does not make downloads free and does not affect public streaming.
insert into public.catalog_offers
  (item_id, code, offer_type, title, description, price_cents, currency, status, fulfillment_type)
select item.id, 'library-access', 'library_access', 'Add to Library',
  'Save this Item to your 44OS Library.', 0, 'USD', 'active', 'entitlement'
from public.catalog_items item
where item.status='published'
  and (item.is_free or item.price_cents=0 or (item.experience_type='music' and item.streaming_enabled))
on conflict (item_id, code) do nothing;

insert into public.offer_entitlements (offer_id, entitlement_type)
select offer.id, 'library_access'
from public.catalog_offers offer where offer.code='library-access'
on conflict do nothing;

-- Future paid options are represented but deliberately inactive.
insert into public.catalog_offers
  (item_id, code, offer_type, title, description, price_cents, currency, status, fulfillment_type)
select item.id, 'digital-download-usd', 'digital_download', 'Downloadable Copy',
  'Download entitlement; pricing and launch state require an approved commerce model.',
  greatest(item.price_cents,0), 'USD', 'draft', 'entitlement'
from public.catalog_items item
where item.fulfillment_type in ('digital','hybrid') and item.download_purchase_enabled
on conflict (item_id, code) do nothing;

insert into public.offer_entitlements (offer_id, entitlement_type)
select offer.id, 'download'
from public.catalog_offers offer where offer.code='digital-download-usd'
on conflict do nothing;

insert into public.catalog_offers
  (item_id, code, offer_type, title, description, price_cents, currency, status, fulfillment_type)
select item.id, 'physical-usd', 'physical_purchase', item.title,
  'Physical fulfillment offer; activation requires verified payments and an approved operating model.',
  greatest(item.price_cents,0), 'USD', 'draft', 'physical'
from public.catalog_items item
where item.fulfillment_type in ('physical','hybrid')
on conflict (item_id, code) do nothing;

-- Preserve current Library relationships as access evidence without claiming
-- that legacy purchase rows were payment-verified.
insert into public.entitlements
  (user_id,item_id,entitlement_type,status,source_type,source_id,granted_at)
select entry.user_id,entry.item_id,'library_access','active','legacy_library',entry.id,entry.acquired_at
from public.library_entries entry
on conflict (user_id,item_id,entitlement_type) do nothing;

insert into public.entitlements
  (user_id,item_id,entitlement_type,status,source_type,source_id,granted_at)
select entry.user_id,entry.item_id,'download','active','legacy_library',entry.id,entry.acquired_at
from public.library_entries entry
join public.catalog_items item on item.id=entry.item_id
where entry.acquisition_type in ('paid','purchase')
  and item.fulfillment_type in ('digital','hybrid') and item.download_purchase_enabled
on conflict (user_id,item_id,entitlement_type) do nothing;

insert into public.entitlement_events
  (entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
select entitlement.id,entitlement.user_id,entitlement.item_id,entitlement.entitlement_type,
  'grant',entitlement.source_type,entitlement.source_id,'M5 legacy Library preservation'
from public.entitlements entitlement
where entitlement.source_type='legacy_library';

-- Preserve legacy merch history without treating its client-authored paid state
-- as processor verification.
insert into public.commerce_orders
  (id,buyer_id,status,currency,subtotal_cents,total_cents,placed_at,created_at,updated_at)
select merch.id,merch.buyer_id,'legacy_unverified',merch.currency,
  merch.subtotal_cents,merch.subtotal_cents,merch.created_at,merch.created_at,merch.updated_at
from public.merch_orders merch
on conflict (id) do nothing;

insert into public.commerce_order_items
  (id,order_id,offer_id,item_id,seller_id,item_title,offer_title,offer_type,quantity,
   unit_price_cents,line_total_cents,currency,fulfillment_status,created_at)
select line.id,line.order_id,offer.id,line.item_id,merch.creator_id,item.title,offer.title,
  offer.offer_type,line.quantity,line.unit_price_cents,line.line_total_cents,merch.currency,
  case merch.status when 'in_progress' then 'in_progress' when 'completed' then 'fulfilled'
    when 'received' then 'fulfilled' else 'pending' end,
  line.created_at
from public.merch_order_items line
join public.merch_orders merch on merch.id=line.order_id
join public.catalog_items item on item.id=line.item_id
join public.catalog_offers offer on offer.item_id=line.item_id and offer.code='physical-usd'
on conflict (id) do nothing;

insert into public.commerce_order_addresses
  (order_id,recipient_name,address_line_1,address_line_2,city,region,postal_code,country_code,delivery_notes,created_at)
select merch.id,merch.delivery_name,merch.delivery_address_1,merch.delivery_address_2,
  merch.delivery_city,merch.delivery_region,merch.delivery_postal_code,merch.delivery_country,
  merch.delivery_notes,merch.created_at
from public.merch_orders merch
on conflict (order_id) do nothing;

create or replace function public.sync_default_library_offer()
returns trigger language plpgsql security definer set search_path=public as $$
declare offer_id uuid;
begin
  if new.status='published' and (new.is_free or new.price_cents=0 or (new.experience_type='music' and new.streaming_enabled)) then
    insert into public.catalog_offers
      (item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type)
    values (new.id,'library-access','library_access','Add to Library',
      'Save this Item to your 44OS Library.',0,'USD','active','entitlement')
    on conflict (item_id,code) do update set status='active',price_cents=0
    returning id into offer_id;
    insert into public.offer_entitlements(offer_id,entitlement_type)
    values(offer_id,'library_access') on conflict do nothing;
  else
    update public.catalog_offers set status='archived'
    where item_id=new.id and code='library-access';
  end if;
  return new;
end;
$$;

create trigger catalog_items_sync_default_library_offer
after insert or update of status,is_free,price_cents,experience_type,streaming_enabled on public.catalog_items
for each row execute function public.sync_default_library_offer();

create or replace function public.save_item_to_library(target_item_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid := auth.uid();
declare offer_row public.catalog_offers;
declare entitlement_row public.entitlements;
declare previous_status text;
declare library_id uuid;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  select offer.* into offer_row
  from public.catalog_offers offer
  join public.catalog_items item on item.id=offer.item_id
  where offer.item_id=target_item_id and offer.offer_type='library_access'
    and offer.status='active' and offer.price_cents=0 and item.status='published'
    and (offer.starts_at is null or offer.starts_at<=now())
    and (offer.ends_at is null or offer.ends_at>now())
  order by offer.created_at limit 1;
  if offer_row.id is null then raise exception 'free Library access is not available for this Item'; end if;

  select * into entitlement_row from public.entitlements
  where user_id=active_user and item_id=target_item_id and entitlement_type='library_access';
  previous_status := entitlement_row.status;

  insert into public.entitlements
    (user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
  values(active_user,target_item_id,'library_access','active','free_offer',offer_row.id,now(),null)
  on conflict(user_id,item_id,entitlement_type) do update
    set status='active',source_type='free_offer',source_id=offer_row.id,
        granted_at=case when public.entitlements.status='active' then public.entitlements.granted_at else now() end,
        revoked_at=null,expires_at=null
  returning * into entitlement_row;

  if previous_status is distinct from 'active' then
    insert into public.entitlement_events
      (entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,actor_id,reason)
    values(entitlement_row.id,active_user,target_item_id,'library_access',
      case when previous_status is null then 'grant' else 'restore' end,
      'free_offer',offer_row.id,active_user,'Free Library save');
  end if;

  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
  values(active_user,target_item_id,'free','visible',now())
  on conflict(user_id,item_id) do update
    set status='visible',
        acquisition_type=case when public.library_entries.acquisition_type in ('paid','purchase','grant')
          then public.library_entries.acquisition_type else 'free' end
  returning id into library_id;
  return library_id;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(auth.role()='service_role',false) or exists(
    select 1 from public.profiles where id=auth.uid() and role='admin'
  );
$$;

create or replace function public.grant_item_entitlement(
  target_user_id uuid,target_item_id uuid,target_entitlement_type text,
  grant_source_type text default 'manual_grant',grant_source_id uuid default null,
  grant_reason text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare entitlement_row public.entitlements;
begin
  if not public.is_platform_admin() then raise exception 'admin access required'; end if;
  if target_entitlement_type not in ('library_access','download','read','launch','bonus_content') then raise exception 'invalid entitlement type'; end if;
  if grant_source_type not in ('manual_grant','achievement','admin','order') then raise exception 'invalid source type'; end if;
  insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
  values(target_user_id,target_item_id,target_entitlement_type,'active',grant_source_type,grant_source_id,now(),null)
  on conflict(user_id,item_id,entitlement_type) do update
    set status='active',source_type=excluded.source_type,source_id=excluded.source_id,
        granted_at=now(),revoked_at=null,expires_at=null
  returning * into entitlement_row;
  insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,actor_id,reason)
  values(entitlement_row.id,target_user_id,target_item_id,target_entitlement_type,'grant',grant_source_type,grant_source_id,auth.uid(),grant_reason);
  return entitlement_row.id;
end;
$$;

create or replace function public.revoke_item_entitlement(target_entitlement_id uuid,revoke_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare entitlement_row public.entitlements;
begin
  if not public.is_platform_admin() then raise exception 'admin access required'; end if;
  update public.entitlements set status='revoked',revoked_at=now()
  where id=target_entitlement_id returning * into entitlement_row;
  if entitlement_row.id is null then raise exception 'entitlement not found'; end if;
  insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,actor_id,reason)
  values(entitlement_row.id,entitlement_row.user_id,entitlement_row.item_id,entitlement_row.entitlement_type,
    'revoke',entitlement_row.source_type,entitlement_row.source_id,auth.uid(),revoke_reason);
end;
$$;

alter table public.catalog_offers enable row level security;
alter table public.offer_entitlements enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_order_items enable row level security;
alter table public.commerce_order_addresses enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.entitlement_events enable row level security;

create policy catalog_offers_read on public.catalog_offers for select
using (status='active' or public.can_manage_item(item_id));
create policy catalog_offers_manage on public.catalog_offers for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));
create policy offer_entitlements_read on public.offer_entitlements for select
using (exists(select 1 from public.catalog_offers offer where offer.id=offer_id and (offer.status='active' or public.can_manage_item(offer.item_id))));
create policy offer_entitlements_manage on public.offer_entitlements for all to authenticated
using (exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id)))
with check (exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id)));

create policy commerce_orders_buyer_read on public.commerce_orders for select to authenticated using (buyer_id=auth.uid());
create policy commerce_order_items_buyer_read on public.commerce_order_items for select to authenticated
using (exists(select 1 from public.commerce_orders orders where orders.id=order_id and orders.buyer_id=auth.uid()));
create policy commerce_order_addresses_buyer_read on public.commerce_order_addresses for select to authenticated
using (exists(select 1 from public.commerce_orders orders where orders.id=order_id and orders.buyer_id=auth.uid()));
create policy payment_attempts_buyer_read on public.payment_attempts for select to authenticated
using (exists(select 1 from public.commerce_orders orders where orders.id=order_id and orders.buyer_id=auth.uid()));
create policy entitlements_owner_read on public.entitlements for select to authenticated using(user_id=auth.uid());
create policy entitlement_events_owner_read on public.entitlement_events for select to authenticated using(user_id=auth.uid());

drop policy if exists "Users can add items to their library" on public.library_entries;
revoke insert on public.library_entries from anon,authenticated;

grant select on public.catalog_offers,public.offer_entitlements to anon,authenticated;
grant insert,update,delete on public.catalog_offers,public.offer_entitlements to authenticated;
grant select on public.commerce_orders,public.commerce_order_items,public.commerce_order_addresses,
  public.payment_attempts,public.entitlements,public.entitlement_events to authenticated;
grant all on public.catalog_offers,public.offer_entitlements,public.commerce_orders,
  public.commerce_order_items,public.commerce_order_addresses,public.payment_attempts,
  public.payment_events,public.entitlements,public.entitlement_events to service_role;

grant execute on function public.save_item_to_library(uuid) to authenticated;
grant execute on function public.grant_item_entitlement(uuid,uuid,text,text,uuid,text) to authenticated,service_role;
grant execute on function public.revoke_item_entitlement(uuid,text) to authenticated,service_role;
revoke execute on function public.save_item_to_library(uuid) from public,anon;
revoke execute on function public.grant_item_entitlement(uuid,uuid,text,text,uuid,text) from public,anon;
revoke execute on function public.revoke_item_entitlement(uuid,text) from public,anon;

comment on table public.payment_events is
  'Immutable provider webhook inbox. Provider event IDs enforce idempotency; raw payload is retained for audit and reconciliation.';
comment on table public.commerce_orders is
  'Provider-neutral order ledger. Paid status may be set only by trusted server/payment processing; legacy_unverified explicitly marks pre-M5 client-authored history.';
