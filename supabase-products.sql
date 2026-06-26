-- 44 Platform product catalog setup
-- Run this in Supabase SQL Editor before importing products from CSV.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator text not null,
  product_type text not null,
  category text not null,
  description text,
  price_cents integer not null default 0,
  is_free boolean not null default true,
  is_published boolean not null default true,
  featured boolean not null default false,
  tags text[] not null default '{}',
  cover_url text,
  linked_release_id uuid references public.releases(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public products are readable" on public.products;
create policy "Public products are readable"
on public.products
for select
to anon, authenticated
using (is_published = true);

alter table public.library_items
  add column if not exists product_id uuid references public.products(id) on delete cascade;

alter table public.library_items
  drop constraint if exists library_items_user_product_unique;

alter table public.library_items
  add constraint library_items_user_product_unique
  unique (user_id, product_id);

drop policy if exists "Users can add free items to their library" on public.library_items;
drop policy if exists "Users can add free products to their library" on public.library_items;
create policy "Users can add free products to their library"
on public.library_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and acquisition_type = 'free'
  and (
    (product_id is null and release_id is not null)
    or exists (
      select 1
      from public.products
      where products.id = library_items.product_id
        and products.is_free = true
        and products.is_published = true
    )
  )
);

-- Optional seed: create product rows from existing releases.
insert into public.products (
  title,
  creator,
  product_type,
  category,
  description,
  price_cents,
  is_free,
  is_published,
  featured,
  tags,
  linked_release_id
)
select
  releases.title,
  releases.artist,
  releases.type,
  'Music',
  null,
  0,
  true,
  true,
  false,
  coalesce(releases.tags, '{}'),
  releases.id
from public.releases
where not exists (
  select 1
  from public.products
  where products.linked_release_id = releases.id
);
