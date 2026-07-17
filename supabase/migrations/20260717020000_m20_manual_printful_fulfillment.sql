begin;

-- M20 forward launch boundary: 44OS may create a non-charging Printful draft,
-- while the owner alone confirms it in the Printful interface. Signed provider
-- evidence may then advance production and shipment state. 44OS still exposes
-- no confirmation operation and cannot initiate a Printful Wallet charge.

alter table public.printful_runtime_controls
  drop constraint if exists printful_confirmation_phase_lock,
  add constraint printful_no_api_confirmation_lock check (not confirmation_enabled);

alter table public.printful_fulfillment_orders
  drop constraint if exists printful_fulfillment_orders_provider_status_check,
  drop constraint if exists printful_fulfillment_orders_charged_cents_check,
  add constraint printful_fulfillment_orders_provider_status_check check (provider_status in (
    'draft','inreview','pending','onhold','partial','fulfilled','failed','canceled','returned'
  )),
  add constraint printful_fulfillment_orders_charged_cents_check check (charged_cents >= 0),
  add column provider_dashboard_url text,
  add column confirmed_externally_at timestamptz,
  add column last_provider_event_at timestamptz,
  add constraint printful_dashboard_url_check
    check (provider_dashboard_url is null or provider_dashboard_url ~ '^https://');

create table public.printful_pricing_approvals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  retail_price_cents integer not null check (retail_price_cents > 0),
  maximum_provider_cost_cents integer not null check (maximum_provider_cost_cents >= 0),
  minimum_margin_cents integer not null check (minimum_margin_cents >= 0),
  eligible_variant_count integer not null check (eligible_variant_count > 0),
  blocked_variant_count integer not null check (blocked_variant_count >= 0),
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now()
);

create table public.printful_fulfillment_shipments (
  id uuid primary key default gen_random_uuid(),
  fulfillment_order_id uuid not null references public.printful_fulfillment_orders(id) on delete restrict,
  provider_shipment_id bigint not null,
  status text not null check (status in ('pending','shipped','delivered','returned','canceled')),
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  last_provider_event_at timestamptz not null,
  provider_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fulfillment_order_id,provider_shipment_id),
  check (tracking_url is null or tracking_url ~ '^https://'),
  check (jsonb_typeof(provider_snapshot)='object')
);

create trigger printful_fulfillment_shipments_touch
before update on public.printful_fulfillment_shipments
for each row execute function public.touch_content_updated_at();

create or replace function public.protect_printful_pricing_approval()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Printful pricing approvals are immutable.' using errcode='55000';
end;
$$;

create trigger printful_pricing_approvals_immutable
before update or delete on public.printful_pricing_approvals
for each row execute function public.protect_printful_pricing_approval();

alter table public.printful_pricing_approvals enable row level security;
alter table public.printful_fulfillment_shipments enable row level security;

create policy printful_pricing_approvals_admin_read
on public.printful_pricing_approvals for select to authenticated
using (public.is_platform_admin());

create policy printful_fulfillment_shipments_admin_read
on public.printful_fulfillment_shipments for select to authenticated
using (public.is_platform_admin());

revoke all on public.printful_pricing_approvals,public.printful_fulfillment_shipments
from public,anon,authenticated;
grant select on public.printful_pricing_approvals,public.printful_fulfillment_shipments
to authenticated;
grant all on public.printful_pricing_approvals,public.printful_fulfillment_shipments
to service_role;

comment on table public.printful_fulfillment_orders is
  'Manual-review Printful order evidence. 44OS creates drafts; only the owner may confirm in Printful. Signed events may record later provider state.';
comment on table public.printful_fulfillment_shipments is
  'Minimized signed Printful shipment and tracking evidence, protected from out-of-order event regression.';
comment on table public.printful_pricing_approvals is
  'Immutable owner pricing evidence. At least one current variant must satisfy margin; higher-cost or unavailable variants remain blocked.';

commit;
