create table public.catalog_taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  experience_type text not null check (experience_type in ('music', 'book', 'physical', 'asset')),
  level text not null check (level in ('type', 'tag')),
  parent_id uuid references public.catalog_taxonomy_terms(id) on delete cascade,
  label text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experience_type, level, slug),
  check ((level = 'type' and parent_id is null) or level = 'tag')
);

create table public.item_taxonomy_terms (
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  term_id uuid not null references public.catalog_taxonomy_terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, term_id)
);

alter table public.catalog_taxonomy_terms enable row level security;
alter table public.item_taxonomy_terms enable row level security;

create policy catalog_taxonomy_terms_read on public.catalog_taxonomy_terms for select using (is_active = true);
create policy catalog_taxonomy_terms_admin on public.catalog_taxonomy_terms for all to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));
create policy item_taxonomy_terms_read on public.item_taxonomy_terms for select using (true);
create policy item_taxonomy_terms_manage on public.item_taxonomy_terms for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

grant select on public.catalog_taxonomy_terms, public.item_taxonomy_terms to anon, authenticated;
grant insert, update, delete on public.catalog_taxonomy_terms, public.item_taxonomy_terms to authenticated;

insert into public.catalog_taxonomy_terms (experience_type, level, label, slug, sort_order) values
  ('music', 'type', 'Album', 'album', 10),
  ('music', 'type', 'EP', 'ep', 20),
  ('music', 'type', 'Single', 'single', 30),
  ('music', 'type', 'Mixtape', 'mixtape', 40),
  ('music', 'type', 'Live Set', 'live-set', 50),
  ('book', 'type', 'Novel', 'novel', 10),
  ('book', 'type', 'Artbook', 'artbook', 20),
  ('book', 'type', 'Zine', 'zine', 30),
  ('physical', 'type', 'Apparel', 'apparel', 10),
  ('physical', 'type', 'Accessories', 'accessories', 20),
  ('physical', 'type', 'Physical Music', 'physical-music', 30),
  ('physical', 'type', 'Goods & Collectibles', 'goods-collectibles', 40),
  ('asset', 'type', 'Sample Packs', 'sample-packs', 10),
  ('asset', 'type', 'Remix Packs', 'remix-packs', 20),
  ('asset', 'type', 'Game Assets', 'game-assets', 30);

insert into public.item_taxonomy_terms (item_id, term_id)
select item.id, term.id
from public.catalog_items item
join public.catalog_taxonomy_terms term
  on term.level = 'type'
 and term.experience_type = case item.experience_type when 'merch' then 'physical' else item.experience_type end
 and regexp_replace(lower(term.label), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(item.item_type), '[^a-z0-9]+', '', 'g')
on conflict do nothing;

insert into public.item_taxonomy_terms (item_id, term_id)
select item.id, term.id
from public.catalog_items item
join public.catalog_taxonomy_terms term
  on term.level = 'type'
 and term.experience_type = case item.experience_type when 'merch' then 'physical' else item.experience_type end
where exists (
  select 1 from unnest(item.tags) tag
  where regexp_replace(lower(term.label), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(tag), '[^a-z0-9]+', '', 'g')
)
on conflict do nothing;
