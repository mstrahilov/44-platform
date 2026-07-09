-- 44OS Merch orders foundation
-- Reviewed SQL only. Run manually after confirming backup/rollback.
-- Purpose: add local-fulfillment merch orders without changing digital checkout.

create extension if not exists pgcrypto;

create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  delivery_name text not null,
  delivery_address_1 text not null,
  delivery_address_2 text,
  delivery_city text not null,
  delivery_region text not null,
  delivery_postal_code text not null,
  delivery_country text not null,
  delivery_notes text,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  status text not null default 'paid' check (status in ('paid', 'in_progress', 'completed', 'received')),
  paid_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists merch_orders_buyer_idx
  on public.merch_orders (buyer_id, created_at desc);

create index if not exists merch_orders_creator_idx
  on public.merch_orders (creator_id, created_at desc);

create index if not exists merch_order_items_order_idx
  on public.merch_order_items (order_id);

create or replace function public.set_merch_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_merch_orders_updated_at on public.merch_orders;
create trigger set_merch_orders_updated_at
before update on public.merch_orders
for each row execute function public.set_merch_orders_updated_at();

alter table public.merch_orders enable row level security;
alter table public.merch_order_items enable row level security;

drop policy if exists "merch orders buyer read" on public.merch_orders;
create policy "merch orders buyer read"
on public.merch_orders
for select
using (auth.uid() = buyer_id);

drop policy if exists "merch orders creator read" on public.merch_orders;
create policy "merch orders creator read"
on public.merch_orders
for select
using (auth.uid() = creator_id);

drop policy if exists "merch orders buyer insert" on public.merch_orders;
create policy "merch orders buyer insert"
on public.merch_orders
for insert
with check (auth.uid() = buyer_id);

drop policy if exists "merch orders creator update" on public.merch_orders;
create policy "merch orders creator update"
on public.merch_orders
for update
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

drop policy if exists "merch order items buyer creator read" on public.merch_order_items;
create policy "merch order items buyer creator read"
on public.merch_order_items
for select
using (
  exists (
    select 1
    from public.merch_orders
    where merch_orders.id = merch_order_items.order_id
      and (merch_orders.buyer_id = auth.uid() or merch_orders.creator_id = auth.uid())
  )
);

drop policy if exists "merch order items buyer insert" on public.merch_order_items;
create policy "merch order items buyer insert"
on public.merch_order_items
for insert
with check (
  exists (
    select 1
    from public.merch_orders
    where merch_orders.id = merch_order_items.order_id
      and merch_orders.buyer_id = auth.uid()
  )
);
