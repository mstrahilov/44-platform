-- 44 Platform clean Supabase reset
-- WARNING: This deletes all existing public app data and recreates the clean schema.
-- It does not delete Supabase Auth users.

create extension if not exists pgcrypto;

drop table if exists public.post_tags cascade;
drop table if exists public.resource_tags cascade;
drop table if exists public.service_tags cascade;
drop table if exists public.product_tags cascade;
drop table if exists public.service_requests cascade;
drop table if exists public.saved_resources cascade;
drop table if exists public.library_items cascade;
drop table if exists public.posts cascade;
drop table if exists public.resources cascade;
drop table if exists public.services cascade;
drop table if exists public.products cascade;
drop table if exists public.tags cascade;
drop table if exists public.categories cascade;
drop table if exists public.creators cascade;
drop table if exists public.profiles cascade;
drop table if exists public.release_creators cascade;
drop table if exists public.achievements cascade;
drop table if exists public.extras cascade;
drop table if exists public.tracks cascade;
drop table if exists public.releases cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('member', 'creator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creators (
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

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('products', 'services', 'resources', 'posts')),
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (scope, slug)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  creator text not null,
  product_type text not null,
  category text not null,
  description text,
  feature_description text,
  price_cents integer not null default 0,
  is_free boolean not null default true,
  is_published boolean not null default true,
  featured boolean not null default false,
  tags text[] not null default '{}',
  cover_url text,
  hero_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text,
  feature_description text,
  starting_price_cents integer not null default 0,
  delivery_estimate text,
  cover_url text,
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
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

create table public.posts (
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

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table public.service_tags (
  service_id uuid not null references public.services(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (service_id, tag_id)
);

create table public.resource_tags (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (resource_id, tag_id)
);

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  acquisition_type text not null default 'free' check (acquisition_type in ('free', 'paid', 'grant')),
  acquired_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create table public.service_requests (
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
  ('posts', 'updates', 'Updates', 50);

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
on categories.scope = seed.scope and categories.slug = seed.category_slug;

insert into public.creators (slug, name, bio, is_published) values
  ('creator-a', 'Creator A', 'Placeholder creator profile for testing products, services, posts, and resources.', true),
  ('creator-b', 'Creator B', 'Placeholder creator profile for testing a second public catalog.', true),
  ('creator-c', 'Creator C', 'Placeholder creator profile for testing community and service surfaces.', true);

insert into public.products (creator_id, category_id, slug, title, creator, product_type, category, description, price_cents, is_free, featured, tags)
select creators.id, categories.id, seed.slug, seed.title, creators.name, seed.product_type, categories.name, seed.description, seed.price_cents, seed.is_free, seed.featured, seed.tags
from (
  values
    ('creator-a', 'music', 'product-a', 'Product A', 'Album', 'Description text for a music product used to test product cards and detail pages.', 0, true, true, array['Album', 'Ambient']),
    ('creator-b', 'games', 'product-b', 'Product B', 'Game', 'Description text for a game product used to test grid wrapping and product pages.', 1499, false, true, array['Puzzle', 'Web Game']),
    ('creator-c', 'interactive', 'product-c', 'Product C', 'Interactive Experience', 'Description text for an interactive product used to test hero and browse surfaces.', 0, true, true, array['Interactive', 'Unity']),
    ('creator-a', 'sample-packs', 'product-d', 'Product D', 'Sample Pack', 'Description text for a sample pack product.', 999, false, false, array['Samples', 'Ambient'])
) as seed(creator_slug, category_slug, slug, title, product_type, description, price_cents, is_free, featured, tags)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'products' and categories.slug = seed.category_slug;

insert into public.services (creator_id, category_id, slug, title, description, starting_price_cents, delivery_estimate, featured)
select creators.id, categories.id, seed.slug, seed.title, seed.description, seed.starting_price_cents, seed.delivery_estimate, seed.featured
from (
  values
    ('creator-a', 'music', 'music-production', 'Music Production', 'Full track production from concept to master-ready file.', 14900, '5-7 day delivery', true),
    ('creator-b', 'design', 'web-design', 'Web Design', 'Website and landing page design for creators, products, and releases.', 29900, '7-10 day delivery', true),
    ('creator-c', 'design', 'graphic-design', 'Graphic Design', 'Visual identity, cover design, and campaign assets.', 9900, '3-5 day delivery', true),
    ('creator-b', 'development', 'game-development', 'Game Development', 'Prototype and web game development for interactive creator experiences.', 49900, 'Project-based', false)
) as seed(creator_slug, category_slug, slug, title, description, starting_price_cents, delivery_estimate, featured)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'services' and categories.slug = seed.category_slug;

insert into public.resources (creator_id, category_id, slug, title, summary, body, resource_type)
select creators.id, categories.id, seed.slug, seed.title, seed.summary, seed.body, seed.resource_type
from (
  values
    ('creator-a', 'guides', 'guide-a', 'Guide A', 'Generic guide summary for testing resource cards.', 'Description text for Guide A.', 'guide'),
    ('creator-b', 'templates', 'template-a', 'Template A', 'Generic template summary for testing saved resources.', 'Description text for Template A.', 'template'),
    ('creator-c', 'lessons', 'lesson-a', 'Lesson A', 'Generic lesson summary for testing community learning content.', 'Description text for Lesson A.', 'lesson'),
    ('creator-a', 'checklists', 'checklist-a', 'Checklist A', 'Generic checklist summary for launch and workflow testing.', 'Description text for Checklist A.', 'checklist')
) as seed(creator_slug, category_slug, slug, title, summary, body, resource_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'resources' and categories.slug = seed.category_slug;

insert into public.posts (creator_id, category_id, title, body, post_type)
select creators.id, categories.id, seed.title, seed.body, seed.post_type
from (
  values
    ('creator-a', 'feed', 'Post A', 'Generic community feed post for testing.', 'feed'),
    ('creator-b', 'dev-logs', 'Post B', 'Generic development log post for testing.', 'dev_log'),
    ('creator-c', 'updates', 'Post C', 'Generic update post for testing.', 'update')
) as seed(creator_slug, category_slug, title, body, post_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'posts' and categories.slug = seed.category_slug;

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
alter table public.library_items enable row level security;
alter table public.saved_resources enable row level security;
alter table public.service_requests enable row level security;

create policy "Public profiles are readable" on public.profiles for select to anon, authenticated using (true);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Public creators are readable" on public.creators for select to anon, authenticated using (is_published = true);
create policy "Public categories are readable" on public.categories for select to anon, authenticated using (true);
create policy "Public tags are readable" on public.tags for select to anon, authenticated using (true);
create policy "Public products are readable" on public.products for select to anon, authenticated using (is_published = true and status = 'published');
create policy "Public services are readable" on public.services for select to anon, authenticated using (status = 'published');
create policy "Public resources are readable" on public.resources for select to anon, authenticated using (status = 'published');
create policy "Public posts are readable" on public.posts for select to anon, authenticated using (status = 'published');
create policy "Public product tags are readable" on public.product_tags for select to anon, authenticated using (true);
create policy "Public service tags are readable" on public.service_tags for select to anon, authenticated using (true);
create policy "Public resource tags are readable" on public.resource_tags for select to anon, authenticated using (true);
create policy "Public post tags are readable" on public.post_tags for select to anon, authenticated using (true);

create policy "Users can read their library items" on public.library_items for select to authenticated using (auth.uid() = user_id);
create policy "Users can add free or music products to library" on public.library_items
for insert to authenticated
with check (
  auth.uid() = user_id
  and acquisition_type in ('free', 'grant')
  and exists (
    select 1 from public.products
    where products.id = library_items.product_id
      and (products.is_free = true or lower(products.category) = 'music')
      and products.is_published = true
      and products.status = 'published'
  )
);
create policy "Users can update their library items" on public.library_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read their saved resources" on public.saved_resources for select to authenticated using (auth.uid() = user_id);
create policy "Users can save resources" on public.saved_resources for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove saved resources" on public.saved_resources for delete to authenticated using (auth.uid() = user_id);

create policy "Users can read their service requests" on public.service_requests for select to authenticated using (auth.uid() = user_id);
create policy "Users can create service requests" on public.service_requests for insert to authenticated with check (auth.uid() = user_id);
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
