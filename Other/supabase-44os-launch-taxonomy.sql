-- 44OS launch taxonomy
-- Run this after the existing foundation SQL. It preserves content and standardizes
-- browse categories around Hub -> Category -> optional item tags.

create extension if not exists pgcrypto;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'categories'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%scope%';

  if constraint_name is not null then
    execute format('alter table public.categories drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.categories
  add constraint categories_scope_check
  check (scope in ('products', 'services', 'resources', 'posts', 'creators'));

alter table public.creators
  add column if not exists category_id uuid references public.categories(id) on delete set null;

insert into public.categories (scope, slug, name, sort_order) values
  ('products', 'music', 'Music', 10),
  ('products', 'games', 'Games', 20),
  ('products', 'books', 'Books', 30),
  ('products', 'apparel', 'Apparel', 40),
  ('products', 'assets', 'Assets', 50),
  ('services', 'music-production', 'Music Production', 10),
  ('services', 'video-production', 'Video Production', 20),
  ('services', 'graphic-design', 'Graphic Design', 30),
  ('services', 'web-development', 'Web Development', 40),
  ('services', 'game-development', 'Game Development', 50),
  ('services', 'marketing', 'Marketing', 60),
  ('resources', 'music-production', 'Music Production', 10),
  ('resources', 'video-production', 'Video Production', 20),
  ('resources', 'graphic-design', 'Graphic Design', 30),
  ('resources', 'web-development', 'Web Development', 40),
  ('resources', 'game-development', 'Game Development', 50),
  ('resources', 'marketing', 'Marketing', 60),
  ('posts', 'discussions', 'Discussions', 10),
  ('creators', 'members', 'Members', 20),
  ('posts', 'reviews', 'Reviews', 30),
  ('posts', 'news', 'News', 40)
on conflict (scope, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- Remap older prototype categories into the launch category system.
update public.products
set category_id = target.id,
    category = target.name
from public.categories old_category
join public.categories target on target.scope = 'products'
  and target.slug = case
    when old_category.slug = 'interactive' then 'games'
    when old_category.slug in ('sample-packs', 'tools') then 'assets'
    else old_category.slug
  end
where products.category_id = old_category.id
  and old_category.scope = 'products';

update public.services
set category_id = target.id
from public.categories old_category
join public.categories target on target.scope = 'services'
  and target.slug = case
    when old_category.slug in ('session-performance', 'songwriting') then 'music-production'
    when old_category.slug = 'visual-design' then 'graphic-design'
    when old_category.slug = 'video-motion' then 'video-production'
    when old_category.slug = 'development' then 'web-development'
    when old_category.slug = 'strategy' then 'marketing'
    else old_category.slug
  end
where services.category_id = old_category.id
  and old_category.scope = 'services';

-- Existing resources used format categories. Until each row is manually assigned,
-- place them under Music Production so they remain visible.
update public.resources
set category_id = target.id
from public.categories old_category
join public.categories target on target.scope = 'resources'
  and target.slug = case
    when old_category.scope = 'resources' then 'music-production'
    else old_category.slug
  end
where resources.category_id = old_category.id
  and old_category.scope = 'resources';

update public.posts
set category_id = target.id
from public.categories old_category
join public.categories target on target.scope = 'posts'
  and target.slug = case
    when old_category.slug in ('streams', 'showcases', 'requests', 'updates') then 'discussions'
    else old_category.slug
  end
where posts.category_id = old_category.id
  and old_category.scope = 'posts';

update public.creators
set category_id = target.id
from public.categories target
where target.scope = 'creators'
  and target.slug = 'members'
  and creators.category_id is distinct from target.id;

-- Remove old prototype categories only after rows have been remapped.
delete from public.categories
where (scope, slug) in (
  ('products', 'sample-packs'),
  ('products', 'interactive'),
  ('products', 'tools'),
  ('services', 'session-performance'),
  ('services', 'songwriting'),
  ('services', 'visual-design'),
  ('services', 'video-motion'),
  ('services', 'development'),
  ('services', 'strategy'),
  ('resources', 'articles'),
  ('resources', 'guides'),
  ('resources', 'templates'),
  ('resources', 'lessons'),
  ('resources', 'downloads'),
  ('resources', 'checklists'),
  ('creators', 'creators'),
  ('posts', 'streams'),
  ('posts', 'showcases'),
  ('posts', 'requests'),
  ('posts', 'updates')
);

create index if not exists categories_scope_slug_idx on public.categories(scope, slug);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists services_category_idx on public.services(category_id);
create index if not exists resources_category_idx on public.resources(category_id);
create index if not exists posts_category_idx on public.posts(category_id);
create index if not exists creators_category_idx on public.creators(category_id);
