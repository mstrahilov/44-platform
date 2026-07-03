-- Local + global pricing foundation for products and services.
-- Run this in Supabase before using Dashboard > Preferences pricing controls.

alter table public.profiles
  add column if not exists country_code text,
  add column if not exists display_currency text,
  add column if not exists home_country_code text,
  add column if not exists home_currency text,
  add column if not exists product_market_mode text not null default 'global',
  add column if not exists service_market_mode text not null default 'global';

update public.profiles
set product_market_mode = 'global_plus_local'
where product_market_mode in ('local', 'both');

update public.profiles
set service_market_mode = 'global_plus_local'
where service_market_mode in ('local', 'both');

alter table public.profiles drop constraint if exists profiles_product_market_mode_check;
alter table public.profiles
  add constraint profiles_product_market_mode_check
  check (product_market_mode in ('global', 'global_plus_local'));

alter table public.profiles drop constraint if exists profiles_service_market_mode_check;
alter table public.profiles
  add constraint profiles_service_market_mode_check
  check (service_market_mode in ('global', 'global_plus_local'));

alter table public.products
  add column if not exists market_mode text not null default 'global',
  add column if not exists local_price_cents integer,
  add column if not exists local_currency text,
  add column if not exists available_locally_only boolean not null default false;

update public.products
set market_mode = 'global_plus_local'
where market_mode in ('local', 'both');

alter table public.products drop constraint if exists products_market_mode_check;
alter table public.products
  add constraint products_market_mode_check
  check (market_mode in ('global', 'global_plus_local'));

alter table public.services
  add column if not exists market_mode text not null default 'global',
  add column if not exists local_price_cents integer,
  add column if not exists local_currency text,
  add column if not exists available_locally_only boolean not null default false;

update public.services
set market_mode = 'global_plus_local'
where market_mode in ('local', 'both');

alter table public.services drop constraint if exists services_market_mode_check;
alter table public.services
  add constraint services_market_mode_check
  check (market_mode in ('global', 'global_plus_local'));

create table if not exists public.exchange_rates (
  currency text primary key,
  usd_rate numeric not null,
  updated_at timestamptz not null default now()
);

insert into public.exchange_rates (currency, usd_rate)
values
  ('USD', 1),
  ('NAD', 18),
  ('ZAR', 18),
  ('EUR', 0.92),
  ('GBP', 0.78),
  ('BGN', 1.8),
  ('KES', 129),
  ('NGN', 1500),
  ('BRL', 5.45),
  ('INR', 83)
on conflict (currency)
do update set
  usd_rate = excluded.usd_rate,
  updated_at = now();

alter table public.exchange_rates enable row level security;

drop policy if exists "exchange_rates_read" on public.exchange_rates;
create policy "exchange_rates_read"
  on public.exchange_rates
  for select
  to anon, authenticated
  using (true);

create index if not exists products_market_mode_idx on public.products(market_mode);
create index if not exists services_market_mode_idx on public.services(market_mode);
