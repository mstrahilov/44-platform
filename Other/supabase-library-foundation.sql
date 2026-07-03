-- 44OS Library foundation
-- Run this once in Supabase after deploying the app changes.
-- Library is the canonical name for user-owned products and saved activity.

do $$
begin
  if to_regclass('public.library_items') is null and to_regclass('public.collection_items') is not null then
    alter table public.collection_items rename to library_items;
  end if;

  if to_regclass('public.library_activity') is null and to_regclass('public.collection_activity') is not null then
    alter table public.collection_activity rename to library_activity;
  end if;
end $$;

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  acquisition_type text not null default 'free',
  acquired_at timestamptz not null default now(),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'archived')),
  unique (user_id, product_id)
);

create table if not exists public.library_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  activity_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.library_items enable row level security;
alter table public.library_activity enable row level security;

drop policy if exists "Users can read their library items" on public.library_items;
drop policy if exists "Users can read their collection items" on public.library_items;
drop policy if exists "Users can add free products to library" on public.library_items;
drop policy if exists "Users can add free products to collection" on public.library_items;
drop policy if exists "Users can update their library items" on public.library_items;
drop policy if exists "Users can update their collection items" on public.library_items;
drop policy if exists "Users can remove free library products" on public.library_items;
drop policy if exists "Users can remove free collection products" on public.library_items;
drop policy if exists "Users can add free or music products to library" on public.library_items;
drop policy if exists "Users can add free or music products to collection" on public.library_items;

create policy "Users can read their library items"
on public.library_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add free products to library"
on public.library_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.products
    where products.id = library_items.product_id
      and (products.is_free = true or products.price_cents = 0)
  )
);

create policy "Users can update their library items"
on public.library_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can remove free library products"
on public.library_items
for delete
to authenticated
using (auth.uid() = user_id and acquisition_type = 'free');

drop policy if exists "Users can read their library activity" on public.library_activity;
drop policy if exists "Users can read their collection activity" on public.library_activity;
drop policy if exists "Users can add their library activity" on public.library_activity;
drop policy if exists "Users can add their collection activity" on public.library_activity;

create policy "Users can read their library activity"
on public.library_activity
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their library activity"
on public.library_activity
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists library_items_user_id_idx on public.library_items(user_id);
create index if not exists library_items_product_id_idx on public.library_items(product_id);
create index if not exists library_activity_user_id_idx on public.library_activity(user_id);
create index if not exists library_activity_product_id_idx on public.library_activity(product_id);

-- Legacy taxonomy cleanup for the current Category-only launch model.
-- The app currently reads products.tags as a simple product column when needed,
-- but it no longer reads the shared tags table or join tables.
drop table if exists public.post_tags cascade;
drop table if exists public.product_tags cascade;
drop table if exists public.resource_tags cascade;
drop table if exists public.service_tags cascade;
drop table if exists public.tags cascade;
