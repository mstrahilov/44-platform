begin;

-- M20: Printful provider boundary for 44-owned Merch.
--
-- This phase deliberately cannot confirm an order. It imports provider truth,
-- records reviewed local variants, quotes shipping, and may create idempotent
-- Printful draft orders only. A later reviewed migration must replace the hard
-- confirmation constraint before any Wallet/card charge or manufacturing can
-- begin.

alter table public.provider_webhook_events
  drop constraint if exists provider_webhook_events_provider_check,
  add constraint provider_webhook_events_provider_check
    check (provider in ('stripe','paypal','printful'));

alter table public.commerce_reconciliation_runs
  drop constraint if exists commerce_reconciliation_runs_provider_check,
  drop constraint if exists commerce_reconciliation_runs_scope_check,
  add constraint commerce_reconciliation_runs_provider_check
    check (provider in ('stripe','paypal','printful')),
  add constraint commerce_reconciliation_runs_scope_check
    check (scope in ('payments','refunds','disputes','payouts','fulfillment'));

create table public.printful_runtime_controls (
  singleton boolean primary key default true check (singleton),
  store_id bigint,
  provider_connected boolean not null default false,
  catalog_import_enabled boolean not null default false,
  shipping_quotes_enabled boolean not null default false,
  draft_orders_enabled boolean not null default false,
  confirmation_enabled boolean not null default false,
  webhook_configured boolean not null default false,
  minimum_margin_cents integer not null default 500 check (minimum_margin_cents >= 0),
  quote_ttl_minutes integer not null default 30 check (quote_ttl_minutes between 1 and 60),
  verified_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printful_runtime_controls_dependencies check (
    (not provider_connected and store_id is null and verified_at is null
      and not catalog_import_enabled and not shipping_quotes_enabled
      and not draft_orders_enabled and not webhook_configured)
    or (provider_connected and store_id is not null and verified_at is not null and approved_by is not null)
  ),
  constraint printful_confirmation_phase_lock check (not confirmation_enabled)
);

insert into public.printful_runtime_controls(singleton) values(true);

create table public.merch_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  sku text,
  option_values jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id,code),
  check (jsonb_typeof(option_values)='object')
);

create table public.printful_product_mappings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.catalog_items(id) on delete restrict,
  store_id bigint not null,
  sync_product_id bigint not null,
  external_id text,
  provider_name text not null,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft','reviewed','blocked')),
  provider_snapshot jsonb not null default '{}',
  last_synced_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id,sync_product_id),
  check (jsonb_typeof(provider_snapshot)='object'),
  check ((status='reviewed')=(reviewed_at is not null and reviewed_by is not null))
);

create table public.printful_variant_mappings (
  id uuid primary key default gen_random_uuid(),
  product_mapping_id uuid not null references public.printful_product_mappings(id) on delete cascade,
  merch_variant_id uuid not null unique references public.merch_variants(id) on delete restrict,
  sync_variant_id bigint not null,
  catalog_variant_id integer not null check (catalog_variant_id > 0),
  sku text,
  provider_name text not null,
  size_value text,
  color_value text,
  availability_status text not null check (availability_status in (
    'active','discontinued','out_of_stock','temporary_out_of_stock','unknown'
  )),
  provider_cost_cents integer check (provider_cost_cents is null or provider_cost_cents >= 0),
  provider_currency text check (provider_currency is null or provider_currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','reviewed','blocked')),
  provider_snapshot jsonb not null default '{}',
  last_synced_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_mapping_id,sync_variant_id),
  check (jsonb_typeof(provider_snapshot)='object'),
  check ((status='reviewed')=(reviewed_at is not null and reviewed_by is not null)),
  check (status<>'reviewed' or availability_status='active')
);

create table public.printful_shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_key text not null unique check (quote_key ~ '^[a-f0-9]{64}$'),
  store_id bigint not null,
  recipient_fingerprint text not null check (recipient_fingerprint ~ '^[a-f0-9]{64}$'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  state_code text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  items_snapshot jsonb not null,
  rates_snapshot jsonb not null,
  selected_rate_id text,
  selected_rate_cents integer check (selected_rate_cents is null or selected_rate_cents >= 0),
  quoted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (jsonb_typeof(items_snapshot)='array' and jsonb_array_length(items_snapshot)>0),
  check (jsonb_typeof(rates_snapshot)='array'),
  check (expires_at>quoted_at)
);

create table public.printful_fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  commerce_order_id uuid not null unique references public.commerce_orders(id) on delete restrict,
  shipping_quote_id uuid references public.printful_shipping_quotes(id) on delete restrict,
  store_id bigint not null,
  external_id text not null unique check (external_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  provider_order_id bigint unique,
  provider_status text not null default 'draft' check (provider_status in ('draft','failed','canceled')),
  provider_currency text check (provider_currency is null or provider_currency ~ '^[A-Z]{3}$'),
  provider_subtotal_cents integer check (provider_subtotal_cents is null or provider_subtotal_cents >= 0),
  provider_shipping_cents integer check (provider_shipping_cents is null or provider_shipping_cents >= 0),
  provider_tax_cents integer check (provider_tax_cents is null or provider_tax_cents >= 0),
  provider_total_cents integer check (provider_total_cents is null or provider_total_cents >= 0),
  charged_cents integer not null default 0 check (charged_cents=0),
  confirmation_requested_at timestamptz,
  request_snapshot jsonb not null,
  response_snapshot jsonb not null default '{}',
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confirmation_requested_at is null),
  check (jsonb_typeof(request_snapshot)='object' and jsonb_typeof(response_snapshot)='object')
);

create table public.printful_fulfillment_order_items (
  fulfillment_order_id uuid not null references public.printful_fulfillment_orders(id) on delete restrict,
  commerce_order_item_id uuid not null unique references public.commerce_order_items(id) on delete restrict,
  variant_mapping_id uuid not null references public.printful_variant_mappings(id) on delete restrict,
  provider_order_item_id bigint,
  quantity integer not null check (quantity > 0),
  provider_cost_cents integer check (provider_cost_cents is null or provider_cost_cents >= 0),
  created_at timestamptz not null default now(),
  primary key(fulfillment_order_id,commerce_order_item_id)
);

alter table public.commerce_order_items
  add column merch_variant_id uuid references public.merch_variants(id) on delete restrict;

create or replace function public.validate_merch_variant_owner()
returns trigger language plpgsql set search_path=public as $$
declare item_row public.catalog_items; platform_seller uuid;
begin
  select * into item_row from public.catalog_items where id=new.item_id;
  select platform_seller_id into platform_seller from public.commerce_runtime_controls where singleton;
  if item_row.id is null or item_row.experience_type<>'merch'
     or item_row.fulfillment_type not in ('physical','hybrid')
     or platform_seller is null or item_row.author_id is distinct from platform_seller then
    raise exception 'Merch variants are restricted to 44-owned physical Items.' using errcode='42501';
  end if;
  return new;
end;
$$;

create or replace function public.validate_printful_product_mapping()
returns trigger language plpgsql set search_path=public as $$
declare controls public.printful_runtime_controls; item_row public.catalog_items; platform_seller uuid;
begin
  select * into controls from public.printful_runtime_controls where singleton;
  select * into item_row from public.catalog_items where id=new.item_id;
  select platform_seller_id into platform_seller from public.commerce_runtime_controls where singleton;
  if not controls.provider_connected or controls.store_id is distinct from new.store_id then
    raise exception 'Printful store has not passed the server verification gate.' using errcode='55000';
  end if;
  if item_row.id is null or item_row.experience_type<>'merch'
     or item_row.author_id is distinct from platform_seller then
    raise exception 'Printful mappings are restricted to 44-owned Merch.' using errcode='42501';
  end if;
  return new;
end;
$$;

create or replace function public.validate_printful_variant_mapping()
returns trigger language plpgsql set search_path=public as $$
declare mapping_item uuid; variant_item uuid;
begin
  select item_id into mapping_item from public.printful_product_mappings where id=new.product_mapping_id;
  select item_id into variant_item from public.merch_variants where id=new.merch_variant_id;
  if mapping_item is null or variant_item is null or mapping_item<>variant_item then
    raise exception 'Printful variant mapping does not belong to the mapped 44 Item.' using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger merch_variants_validate before insert or update on public.merch_variants
for each row execute function public.validate_merch_variant_owner();
create trigger printful_product_mappings_validate before insert or update on public.printful_product_mappings
for each row execute function public.validate_printful_product_mapping();
create trigger printful_variant_mappings_validate before insert or update on public.printful_variant_mappings
for each row execute function public.validate_printful_variant_mapping();

create trigger printful_runtime_controls_touch before update on public.printful_runtime_controls
for each row execute function public.touch_content_updated_at();
create trigger merch_variants_touch before update on public.merch_variants
for each row execute function public.touch_content_updated_at();
create trigger printful_product_mappings_touch before update on public.printful_product_mappings
for each row execute function public.touch_content_updated_at();
create trigger printful_variant_mappings_touch before update on public.printful_variant_mappings
for each row execute function public.touch_content_updated_at();
create trigger printful_fulfillment_orders_touch before update on public.printful_fulfillment_orders
for each row execute function public.touch_content_updated_at();

create index merch_variants_item_idx on public.merch_variants(item_id,status,code);
create index printful_variant_mappings_product_idx on public.printful_variant_mappings(product_mapping_id,status,availability_status);
create index printful_shipping_quotes_expiry_idx on public.printful_shipping_quotes(expires_at desc);
create index printful_fulfillment_orders_status_idx on public.printful_fulfillment_orders(provider_status,created_at desc);

alter table public.printful_runtime_controls enable row level security;
alter table public.merch_variants enable row level security;
alter table public.printful_product_mappings enable row level security;
alter table public.printful_variant_mappings enable row level security;
alter table public.printful_shipping_quotes enable row level security;
alter table public.printful_fulfillment_orders enable row level security;
alter table public.printful_fulfillment_order_items enable row level security;

create policy merch_variants_public_read on public.merch_variants for select
using (status='active' and exists(
  select 1 from public.catalog_items item where item.id=item_id and item.status='published'
));
create policy printful_runtime_controls_admin_read on public.printful_runtime_controls for select to authenticated
using (public.is_platform_admin());
create policy printful_product_mappings_admin_read on public.printful_product_mappings for select to authenticated
using (public.is_platform_admin());
create policy printful_variant_mappings_admin_read on public.printful_variant_mappings for select to authenticated
using (public.is_platform_admin());
create policy printful_fulfillment_orders_admin_read on public.printful_fulfillment_orders for select to authenticated
using (public.is_platform_admin());
create policy printful_fulfillment_order_items_admin_read on public.printful_fulfillment_order_items for select to authenticated
using (public.is_platform_admin());

revoke all on public.printful_runtime_controls,public.merch_variants,
  public.printful_product_mappings,public.printful_variant_mappings,
  public.printful_shipping_quotes,public.printful_fulfillment_orders,
  public.printful_fulfillment_order_items from anon,authenticated;
grant select on public.merch_variants to anon,authenticated;
grant select on public.printful_runtime_controls,public.printful_product_mappings,
  public.printful_variant_mappings,public.printful_fulfillment_orders,
  public.printful_fulfillment_order_items to authenticated;
grant all on public.printful_runtime_controls,public.merch_variants,
  public.printful_product_mappings,public.printful_variant_mappings,
  public.printful_shipping_quotes,public.printful_fulfillment_orders,
  public.printful_fulfillment_order_items to service_role;

comment on table public.printful_runtime_controls is
  'Fail-closed Printful controls. confirmation_enabled is hard-locked false in this phase.';
comment on table public.printful_product_mappings is
  'Service-managed mapping from a reviewed 44-owned Merch Item to provider-retrieved Printful Sync Product truth.';
comment on table public.printful_variant_mappings is
  'Service-managed mapping from a canonical 44 Merch variant to a provider-retrieved Printful Sync Variant and Catalog Variant.';
comment on table public.printful_fulfillment_orders is
  'Printful draft-order evidence. This phase forbids confirmation timestamps and all provider charges.';

commit;
