begin;

-- Split the shared category bucket into domain-owned lookup tables.
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.product_categories (id, slug, name, sort_order, created_at)
select id, slug, name, sort_order, created_at
from public.categories
where scope = 'products';

alter table public.product_categories enable row level security;
create policy "product_categories_read"
on public.product_categories for select
to anon, authenticated
using (true);

grant select on table public.product_categories to anon, authenticated;
grant all on table public.product_categories to service_role;

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.service_categories (id, slug, name, sort_order, created_at)
select id, slug, name, sort_order, created_at
from public.categories
where scope = 'services';

alter table public.service_categories enable row level security;
create policy "service_categories_admin_all"
on public.service_categories for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

grant all on table public.service_categories to authenticated, service_role;

alter table public.products drop constraint if exists products_category_id_fkey;
alter table public.products rename column category_id to product_category_id;
alter table public.products
  add constraint products_product_category_id_fkey
  foreign key (product_category_id) references public.product_categories(id) on delete set null;

alter index if exists public.products_category_idx rename to products_product_category_idx;
alter index if exists public.products_category_type_idx rename to products_product_category_type_idx;

alter table public.services drop constraint if exists services_category_id_fkey;
alter table public.services rename column category_id to service_category_id;
alter table public.services
  add constraint services_service_category_id_fkey
  foreign key (service_category_id) references public.service_categories(id) on delete set null;

alter index if exists public.services_category_idx rename to services_service_category_idx;
alter index if exists public.services_category_type_idx rename to services_service_category_type_idx;

-- General posts no longer use category/type multiplexing. Questions and
-- collaborations have their own purpose-built tables.
alter table public.posts drop constraint if exists posts_category_id_fkey;
alter table public.posts drop column if exists category_id;
alter table public.posts drop column if exists post_type;

drop table public.categories;

-- Status and experience_type are the canonical product lifecycle/runtime
-- fields. Remove the legacy duplicate columns and update dependent policies.
drop table if exists public.product_relations;

update public.products
set status = case when is_published then 'published' else 'draft' end
where (is_published and status <> 'published')
   or (not is_published and status = 'published');

drop policy if exists "Public can read product achievements" on public.product_achievements;
drop policy if exists "Public can read product tracks" on public.tracks;
drop policy if exists "Users can add items to their library" on public.library_items;
drop policy if exists "products_read" on public.products;
drop policy if exists "tracks_read" on public.tracks;

alter table public.products
  drop column if exists category,
  drop column if exists runtime_type,
  drop column if exists is_published;

create policy "Public can read product achievements"
on public.product_achievements for select
using (
  exists (
    select 1 from public.products
    where products.id = product_achievements.product_id
      and products.status = 'published'
  )
);

create policy "Public can read product tracks"
on public.tracks for select
using (
  exists (
    select 1 from public.products
    where products.id = tracks.product_id
      and products.status = 'published'
  )
);

create policy "Users can add items to their library"
on public.library_items for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.products p
    where p.id = library_items.product_id
      and p.status = 'published'
      and (
        library_items.acquisition_type = 'purchase'
        or p.is_free
        or coalesce(p.price_cents, 0) = 0
        or (p.experience_type = 'music' and coalesce(p.streaming_enabled, true))
      )
  )
);

create policy "products_read"
on public.products for select
using (author_id = auth.uid() or status = 'published');

create policy "tracks_read"
on public.tracks for select
using (
  exists (
    select 1 from public.products p
    where p.id = tracks.product_id
      and (p.author_id = auth.uid() or p.status = 'published')
  )
);

-- Retire unused speculative systems. Their data remains in the pre-migration
-- backups; each can be reintroduced later with a current product requirement.
drop table if exists public.product_components;
drop table if exists public.item_components;
drop table if exists public.user_unlock_events;
drop table if exists public.unlockables;
drop table if exists public.library_activity;
drop table if exists public.achievement_icon_registry;
drop table if exists public.user_app_preferences;
drop table if exists public.user_os_preferences;
drop table if exists public.radio_tracks;
drop table if exists public.radio_blocks;
drop table if exists public.radio_stations;
drop function if exists public.set_radio_updated_at();

comment on table public.product_categories is
'Top-level categories for canonical products, such as music, books, games, merch, and assets.';

comment on table public.service_categories is
'Private categories for the dormant services placeholder catalog.';

comment on column public.products.product_category_id is
'Optional top-level catalog category. Runtime behavior is defined by experience_type.';

commit;
