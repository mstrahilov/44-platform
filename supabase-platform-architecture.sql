-- ADDITIVE LEGACY MIGRATION - DO NOT RUN FOR THE CLEAN PLATFORM RESET.
-- Use supabase-clean-reset.sql instead.
--
-- 44 Platform architecture migration
-- Run this in Supabase SQL Editor after the existing products/library setup.
-- This is additive: it preserves existing releases, products, and library rows.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('member', 'creator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  bio text,
  hero_url text,
  avatar_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an older creators table in place. Supabase already had a
-- public.creators table in early builds, so create table if not exists will
-- not add these columns by itself.
alter table public.creators
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists slug text,
  add column if not exists name text,
  add column if not exists bio text,
  add column if not exists hero_url text,
  add column if not exists avatar_url text,
  add column if not exists is_published boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.creators
set name = coalesce(name, 'Creator')
where name is null;

with creator_slugs as (
  select
    id,
    lower(regexp_replace(regexp_replace(coalesce(name, 'creator'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) as base_slug,
    row_number() over (
      partition by lower(regexp_replace(regexp_replace(coalesce(name, 'creator'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
      order by id
    ) as slug_rank
  from public.creators
  where slug is null
)
update public.creators
set slug = case
  when creator_slugs.slug_rank = 1 then creator_slugs.base_slug
  else creator_slugs.base_slug || '-' || creator_slugs.slug_rank::text
end
from creator_slugs
where creators.id = creator_slugs.id;

create unique index if not exists creators_slug_unique
on public.creators(slug);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('products', 'services', 'resources', 'posts')),
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (scope, slug)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

alter table public.products
  add column if not exists creator_id uuid references public.creators(id) on delete set null,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists slug text,
  add column if not exists hero_url text,
  add column if not exists status text not null default 'published';

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('draft', 'published', 'archived'));

create unique index if not exists products_slug_unique on public.products(slug) where slug is not null;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text,
  starting_price_cents integer not null default 0,
  delivery_estimate text,
  cover_url text,
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  resource_type text not null default 'guide',
  cover_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid references public.profiles(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  body text,
  post_type text not null default 'feed',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table if not exists public.service_tags (
  service_id uuid not null references public.services(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (service_id, tag_id)
);

create table if not exists public.resource_tags (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (resource_id, tag_id)
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  message text,
  status text not null default 'inquiry' check (status in ('inquiry', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (scope, slug, name, sort_order) values
  ('products', 'music', 'Music', 10),
  ('products', 'games', 'Games', 20),
  ('products', 'books', 'Books', 30),
  ('products', 'apparel', 'Apparel', 40),
  ('products', 'tools', 'Tools', 50),
  ('products', 'interactive', 'Interactive', 60),
  ('products', 'sample-packs', 'Sample Packs', 70),
  ('services', 'music', 'Music', 10),
  ('services', 'design', 'Design', 20),
  ('services', 'video', 'Video', 30),
  ('services', 'development', 'Development', 40),
  ('services', 'consulting', 'Consulting', 50),
  ('resources', 'guides', 'Guides', 10),
  ('resources', 'templates', 'Templates', 20),
  ('resources', 'lessons', 'Lessons', 30),
  ('resources', 'downloads', 'Downloads', 40),
  ('resources', 'checklists', 'Checklists', 50),
  ('posts', 'feed', 'Feed', 10),
  ('posts', 'dev-logs', 'Dev Logs', 20),
  ('posts', 'showcase', 'Showcase', 30),
  ('posts', 'discussions', 'Discussions', 40),
  ('posts', 'updates', 'Updates', 50)
on conflict (scope, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.tags (category_id, slug, name, sort_order)
select categories.id, seed.slug, seed.name, seed.sort_order
from public.categories
join (
  values
    ('products', 'music', 'ambient', 'Ambient', 10),
    ('products', 'music', 'electronic', 'Electronic', 20),
    ('products', 'music', 'album', 'Album', 30),
    ('products', 'games', 'puzzle', 'Puzzle', 10),
    ('products', 'games', 'web-game', 'Web Game', 20),
    ('products', 'books', 'lore', 'Lore', 10),
    ('products', 'sample-packs', 'samples', 'Samples', 10),
    ('products', 'interactive', 'unity', 'Unity', 10),
    ('services', 'music', 'production', 'Production', 10),
    ('services', 'music', 'mixing', 'Mixing', 20),
    ('services', 'design', 'album-art', 'Album Art', 10),
    ('services', 'video', 'editing', 'Editing', 10),
    ('services', 'development', 'unity', 'Unity', 10),
    ('resources', 'guides', 'music-publishing', 'Music Publishing', 10),
    ('resources', 'guides', 'mastering', 'Mastering', 20),
    ('resources', 'templates', 'release-plan', 'Release Plan', 10),
    ('resources', 'lessons', 'production', 'Production', 10),
    ('posts', 'dev-logs', 'process', 'Process', 10),
    ('posts', 'showcase', 'release', 'Release', 10),
    ('posts', 'discussions', 'feedback', 'Feedback', 10)
) as seed(scope, category_slug, slug, name, sort_order)
on categories.scope = seed.scope and categories.slug = seed.category_slug
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.creators (slug, name, bio, is_published) values
  ('44-corporation', '44 CORPORATION', 'Platform studio building interactive releases, tools, and systems for creators.', true),
  ('olsten', 'ØLSTEN', 'Artist and producer releasing music, visual systems, and creator experiments.', true),
  ('lvminvs', 'lvminvs.', 'Producer, designer, visualist, and guitarist operating at the intersection of sound and image.', true)
on conflict (slug) do update set name = excluded.name, bio = excluded.bio, is_published = excluded.is_published;

update public.products
set status = case when is_published then 'published' else 'draft' end
where status is null;

update public.products
set slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

update public.products
set category_id = categories.id
from public.categories
where categories.scope = 'products'
  and lower(categories.name) = lower(products.category)
  and products.category_id is null;

update public.products
set creator_id = creators.id
from public.creators
where lower(creators.name) = lower(products.creator)
  and products.creator_id is null;

insert into public.services (creator_id, category_id, slug, title, description, starting_price_cents, delivery_estimate, featured)
select creators.id, categories.id, seed.slug, seed.title, seed.description, seed.starting_price_cents, seed.delivery_estimate, seed.featured
from (
  values
    ('lvminvs', 'music', 'music-production', 'Music Production', 'Full track production from concept to master-ready file.', 14900, '5-7 day delivery', true),
    ('lvminvs', 'design', 'album-art-design', 'Album Art Design', 'Cover artwork, release visuals, and clean visual systems for creators.', 8900, '3-5 day delivery', true),
    ('44-corporation', 'development', 'interactive-web-experience', 'Interactive Web Experience', 'Web-based interactive experiences for albums, games, and creator worlds.', 49900, 'Project-based', true),
    ('olsten', 'music', 'production-review', 'Production Review', 'Detailed feedback on arrangement, mix direction, and release readiness.', 7900, '2-3 day delivery', false)
) as seed(creator_slug, category_slug, slug, title, description, starting_price_cents, delivery_estimate, featured)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'services' and categories.slug = seed.category_slug
on conflict (slug) do nothing;

insert into public.resources (creator_id, category_id, slug, title, summary, body, resource_type)
select creators.id, categories.id, seed.slug, seed.title, seed.summary, seed.body, seed.resource_type
from (
  values
    ('44-corporation', 'guides', 'how-to-release-music', 'How to Release Music', 'A starter guide for getting music from finished file to public release.', 'A practical checklist for metadata, artwork, distribution, release dates, and post-release updates.', 'guide'),
    ('44-corporation', 'checklists', 'release-day-checklist', 'Release Day Checklist', 'A simple checklist for launches across music, games, books, and tools.', 'Use this to confirm files, pricing, descriptions, links, and announcements before publishing.', 'checklist'),
    ('lvminvs', 'lessons', 'building-an-album-world', 'Building an Album World', 'Notes on turning a release into a full visual and interactive system.', 'A creative process note on sound, visuals, writing, and audience experience.', 'lesson'),
    ('44-corporation', 'templates', 'creator-page-planning-template', 'Creator Page Planning Template', 'A planning resource for profile, products, services, and posts.', 'Use this as a blank structure for preparing creator catalog imports.', 'template')
) as seed(creator_slug, category_slug, slug, title, summary, body, resource_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'resources' and categories.slug = seed.category_slug
on conflict (slug) do nothing;

insert into public.posts (creator_id, category_id, title, body, post_type)
select creators.id, categories.id, seed.title, seed.body, seed.post_type
from (
  values
    ('olsten', 'updates', 'Catalog work is moving into 44', 'Older releases are being mapped into products so they can live properly in user libraries.', 'update'),
    ('lvminvs', 'dev-logs', 'Building release worlds', 'A process note on building music, visuals, and interactive fragments around one release.', 'dev_log'),
    ('44-corporation', 'feed', '44 platform architecture note', 'Store, Services, Community, and Library are now being separated into cleaner data systems.', 'feed')
) as seed(creator_slug, category_slug, title, body, post_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'posts' and categories.slug = seed.category_slug
where not exists (select 1 from public.posts where posts.title = seed.title);

alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.products enable row level security;
alter table public.services enable row level security;
alter table public.resources enable row level security;
alter table public.posts enable row level security;
alter table public.product_tags enable row level security;
alter table public.service_tags enable row level security;
alter table public.resource_tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.saved_resources enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles for select to anon, authenticated using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Public creators are readable" on public.creators;
create policy "Public creators are readable" on public.creators for select to anon, authenticated using (is_published = true);

drop policy if exists "Public categories are readable" on public.categories;
create policy "Public categories are readable" on public.categories for select to anon, authenticated using (true);

drop policy if exists "Public tags are readable" on public.tags;
create policy "Public tags are readable" on public.tags for select to anon, authenticated using (true);

drop policy if exists "Public products are readable" on public.products;
create policy "Public products are readable" on public.products for select to anon, authenticated using (is_published = true or status = 'published');

drop policy if exists "Public services are readable" on public.services;
create policy "Public services are readable" on public.services for select to anon, authenticated using (status = 'published');

drop policy if exists "Public resources are readable" on public.resources;
create policy "Public resources are readable" on public.resources for select to anon, authenticated using (status = 'published');

drop policy if exists "Public posts are readable" on public.posts;
create policy "Public posts are readable" on public.posts for select to anon, authenticated using (status = 'published');

drop policy if exists "Public product tags are readable" on public.product_tags;
create policy "Public product tags are readable" on public.product_tags for select to anon, authenticated using (true);

drop policy if exists "Public service tags are readable" on public.service_tags;
create policy "Public service tags are readable" on public.service_tags for select to anon, authenticated using (true);

drop policy if exists "Public resource tags are readable" on public.resource_tags;
create policy "Public resource tags are readable" on public.resource_tags for select to anon, authenticated using (true);

drop policy if exists "Public post tags are readable" on public.post_tags;
create policy "Public post tags are readable" on public.post_tags for select to anon, authenticated using (true);

drop policy if exists "Users can read their saved resources" on public.saved_resources;
create policy "Users can read their saved resources" on public.saved_resources for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can save resources" on public.saved_resources;
create policy "Users can save resources" on public.saved_resources for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can remove saved resources" on public.saved_resources;
create policy "Users can remove saved resources" on public.saved_resources for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can read their service requests" on public.service_requests;
create policy "Users can read their service requests" on public.service_requests for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create service requests" on public.service_requests;
create policy "Users can create service requests" on public.service_requests for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their service requests" on public.service_requests;
create policy "Users can update their service requests" on public.service_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]+', '-', 'g'))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
