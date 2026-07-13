-- M12 foundation: disabled payment operations and auditable payout/reconciliation ledgers.
--
-- This migration moves no money, activates no offer, and grants no entitlement.
-- Provider credentials and recipient identifiers remain server-only. Existing
-- commerce, Library, Item, Community, entitlement, and audit rows are untouched.

create table public.commerce_runtime_controls (
  singleton boolean primary key default true check (singleton),
  checkout_enabled boolean not null default false,
  stripe_payments_enabled boolean not null default false,
  paypal_payouts_enabled boolean not null default false,
  operating_model_approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint commerce_runtime_controls_fail_closed check (
    not checkout_enabled
    or (stripe_payments_enabled and operating_model_approved_at is not null)
  )
);

insert into public.commerce_runtime_controls(singleton) values(true);

create table public.creator_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (provider in ('paypal')),
  provider_recipient_ref text,
  recipient_country_code text check (recipient_country_code is null or recipient_country_code ~ '^[A-Z]{2}$'),
  preferred_currency text check (preferred_currency is null or preferred_currency ~ '^[A-Z]{3}$'),
  status text not null default 'unverified' check (status in ('unverified','pending','verified','restricted','disabled')),
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, provider),
  constraint creator_payout_account_verified_check check (
    status <> 'verified' or (provider_recipient_ref is not null and verified_at is not null)
  )
);

comment on column public.creator_payout_accounts.provider_recipient_ref is
  'Server-only PayPal recipient identifier. Never expose through public creator/profile queries.';

create table public.creator_earnings_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  order_item_id uuid references public.commerce_order_items(id) on delete restrict,
  entry_type text not null check (entry_type in ('sale','platform_fee','processor_fee','tax','refund','dispute','adjustment','payout')),
  amount_cents bigint not null check (amount_cents <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  source_provider text,
  source_reference text,
  available_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique nulls not distinct (source_provider, source_reference, entry_type, creator_id)
);

create index creator_earnings_entries_creator_idx
  on public.creator_earnings_entries(creator_id, currency, created_at desc);

create table public.creator_payout_batches (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paypal')),
  provider_batch_id text,
  idempotency_key text not null,
  status text not null default 'draft' check (status in ('draft','submitted','processing','succeeded','partially_failed','failed','canceled')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  total_cents bigint not null default 0 check (total_cents >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key),
  unique (provider, provider_batch_id)
);

create table public.creator_payout_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.creator_payout_batches(id) on delete restrict,
  payout_account_id uuid not null references public.creator_payout_accounts(id) on delete restrict,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  provider_item_id text,
  sender_item_id text not null,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','blocked','held','returned','refunded','unclaimed','canceled')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  failure_code text,
  failure_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, sender_item_id),
  unique (batch_id, creator_id),
  unique nulls not distinct (batch_id, provider_item_id)
);

create table public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','paypal')),
  provider_event_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  unique (provider, provider_event_id),
  constraint provider_webhook_processing_check check (
    processing_status = 'received' or signature_verified
  )
);

create table public.commerce_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','paypal')),
  scope text not null check (scope in ('payments','refunds','disputes','payouts')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  status text not null default 'running' check (status in ('running','matched','mismatched','failed')),
  checked_count integer not null default 0 check (checked_count >= 0),
  mismatch_count integer not null default 0 check (mismatch_count >= 0),
  summary jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check (window_end > window_start),
  check (mismatch_count <= checked_count)
);

create or replace function public.reject_immutable_finance_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger creator_earnings_entries_immutable
before update or delete on public.creator_earnings_entries
for each row execute function public.reject_immutable_finance_mutation();

create trigger provider_webhook_events_no_delete
before delete on public.provider_webhook_events
for each row execute function public.reject_immutable_finance_mutation();

create trigger creator_payout_accounts_touch_updated_at before update on public.creator_payout_accounts
for each row execute function public.touch_content_updated_at();
create trigger creator_payout_batches_touch_updated_at before update on public.creator_payout_batches
for each row execute function public.touch_content_updated_at();
create trigger creator_payout_items_touch_updated_at before update on public.creator_payout_items
for each row execute function public.touch_content_updated_at();
create trigger commerce_runtime_controls_touch_updated_at before update on public.commerce_runtime_controls
for each row execute function public.touch_content_updated_at();

alter table public.commerce_runtime_controls enable row level security;
alter table public.creator_payout_accounts enable row level security;
alter table public.creator_earnings_entries enable row level security;
alter table public.creator_payout_batches enable row level security;
alter table public.creator_payout_items enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.commerce_reconciliation_runs enable row level security;

-- Creators may see their accounting ledger and payout status, but never write
-- money state or retrieve the private provider recipient reference directly.
create policy creator_earnings_owner_read on public.creator_earnings_entries
for select to authenticated using (creator_id=auth.uid() or public.is_platform_admin());
create policy creator_payout_items_owner_read on public.creator_payout_items
for select to authenticated using (creator_id=auth.uid() or public.is_platform_admin());
create policy creator_payout_batches_admin_read on public.creator_payout_batches
for select to authenticated using (public.is_platform_admin());
create policy commerce_runtime_controls_admin_read on public.commerce_runtime_controls
for select to authenticated using (public.is_platform_admin());
create policy commerce_reconciliation_admin_read on public.commerce_reconciliation_runs
for select to authenticated using (public.is_platform_admin());

revoke all on public.commerce_runtime_controls,public.creator_payout_accounts,
  public.creator_earnings_entries,public.creator_payout_batches,public.creator_payout_items,
  public.provider_webhook_events,public.commerce_reconciliation_runs from anon,authenticated;
grant select on public.commerce_runtime_controls,public.creator_earnings_entries,
  public.creator_payout_batches,public.creator_payout_items,public.commerce_reconciliation_runs to authenticated;
grant all on public.commerce_runtime_controls,public.creator_payout_accounts,
  public.creator_earnings_entries,public.creator_payout_batches,public.creator_payout_items,
  public.provider_webhook_events,public.commerce_reconciliation_runs to service_role;

comment on table public.commerce_runtime_controls is
  'Fail-closed commerce activation gate. The M12 foundation leaves every switch disabled.';
comment on table public.creator_earnings_entries is
  'Append-only creator accounting ledger. Entries do not themselves prove settlement or payout.';
comment on table public.provider_webhook_events is
  'Signed provider webhook inbox. Unverified events can be retained but cannot be processed.';
