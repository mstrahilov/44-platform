-- 44OS Phase 7 additive schema
-- Additive only: formal item classification, creator/owner asset access,
-- separate reviews/updates primitives, OS preferences, and legacy data bridge.

-- One-description item model: short_description is legacy/card copy and may be empty.
alter table public.products drop constraint if exists products_short_description_length_check;
alter table public.products alter column short_description drop not null;
alter table public.products
  add constraint products_short_description_length_check
  check (short_description is null or (char_length(short_description) between 1 and 220));

alter table public.products add column if not exists experience_type text;
alter table public.products add column if not exists fulfillment_type text;

update public.products
set experience_type = case
  when lower(coalesce(runtime_type, '')) = 'radio'
    or lower(coalesce(category, '')) = 'radio'
    or lower(coalesce(product_type, '')) like '%radio%' then 'radio'
  when lower(coalesce(runtime_type, '')) = 'book'
    or lower(coalesce(category, '')) in ('book', 'books')
    or lower(coalesce(product_type, '')) like '%book%'
    or lower(coalesce(product_type, '')) like '%artbook%' then 'book'
  when lower(coalesce(runtime_type, '')) in ('asset', 'sample pack')
    or lower(coalesce(category, '')) in ('assets', 'sample packs')
    or lower(coalesce(product_type, '')) like '%asset%'
    or lower(coalesce(product_type, '')) like '%sample%'
    or lower(coalesce(product_type, '')) like '%preset%'
    or lower(coalesce(product_type, '')) like '%template%'
    or lower(coalesce(product_type, '')) like '%stem%' then 'asset'
  when lower(coalesce(runtime_type, '')) in ('physical', 'merch')
    or lower(coalesce(category, '')) in ('apparel', 'merch', 'shop')
    or lower(coalesce(product_type, '')) like '%shirt%'
    or lower(coalesce(product_type, '')) like '%hoodie%'
    or lower(coalesce(product_type, '')) like '%poster%'
    or lower(coalesce(product_type, '')) like '%merch%' then 'merch'
  when lower(coalesce(runtime_type, '')) in ('interactive', 'game')
    or lower(coalesce(category, '')) in ('interactive', 'games')
    or lower(coalesce(product_type, '')) like '%game%' then 'game'
  when lower(coalesce(runtime_type, '')) = 'music'
    or lower(coalesce(category, '')) = 'music'
    or lower(coalesce(product_type, '')) like '%album%'
    or lower(coalesce(product_type, '')) like '%ep%'
    or lower(coalesce(product_type, '')) like '%single%'
    or lower(coalesce(product_type, '')) like '%track%' then 'music'
  else 'other'
end
where experience_type is null;

update public.products
set fulfillment_type = case
  when experience_type = 'merch' then 'physical'
  else 'digital'
end
where fulfillment_type is null;

alter table public.products alter column experience_type set default 'other';
alter table public.products alter column fulfillment_type set default 'digital';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_experience_type_check') then
    alter table public.products
      add constraint products_experience_type_check
      check (experience_type in ('music', 'book', 'asset', 'radio', 'video', 'game', 'merch', 'other'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_fulfillment_type_check') then
    alter table public.products
      add constraint products_fulfillment_type_check
      check (fulfillment_type in ('digital', 'physical', 'hybrid'));
  end if;
end $$;

create index if not exists products_experience_type_idx on public.products (experience_type);
create index if not exists products_fulfillment_type_idx on public.products (fulfillment_type);

-- Product relation graph: merch/artbooks/companions without hardcoding.
create table if not exists public.product_relations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  relation_type text not null check (relation_type in ('merch', 'artbook', 'companion')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, related_product_id, relation_type),
  check (product_id <> related_product_id)
);

alter table public.product_relations enable row level security;

drop policy if exists product_relations_read on public.product_relations;
create policy product_relations_read
on public.product_relations for select
using (
  exists (
    select 1 from public.products p
    join public.products rp on rp.id = product_relations.related_product_id
    where p.id = product_relations.product_id
      and (
        p.author_id = auth.uid()
        or ((p.status = 'published' or p.is_published = true) and (rp.status = 'published' or rp.is_published = true))
      )
  )
);

drop policy if exists product_relations_insert_own on public.product_relations;
create policy product_relations_insert_own
on public.product_relations for insert
to authenticated
with check (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

drop policy if exists product_relations_update_own on public.product_relations;
create policy product_relations_update_own
on public.product_relations for update
to authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()))
with check (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

drop policy if exists product_relations_delete_own on public.product_relations;
create policy product_relations_delete_own
on public.product_relations for delete
to authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

-- Product files for books/assets and other owned digital content.
alter table public.product_assets enable row level security;

drop policy if exists product_assets_read_creator_or_owner on public.product_assets;
create policy product_assets_read_creator_or_owner
on public.product_assets for select
to authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_assets.product_id
      and (
        p.author_id = auth.uid()
        or exists (
          select 1 from public.library_items li
          where li.product_id = p.id
            and li.user_id = auth.uid()
            and li.status <> 'hidden'
        )
      )
  )
);

drop policy if exists product_assets_insert_own on public.product_assets;
create policy product_assets_insert_own
on public.product_assets for insert
to authenticated
with check (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

drop policy if exists product_assets_update_own on public.product_assets;
create policy product_assets_update_own
on public.product_assets for update
to authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()))
with check (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

drop policy if exists product_assets_delete_own on public.product_assets;
create policy product_assets_delete_own
on public.product_assets for delete
to authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid()));

-- Reviews are product/store-domain content, not social posts.
alter table public.product_reviews add column if not exists title text;
alter table public.product_reviews add column if not exists rating integer;
alter table public.product_reviews add column if not exists legacy_post_id uuid unique;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_reviews_rating_check') then
    alter table public.product_reviews
      add constraint product_reviews_rating_check
      check (rating is null or rating between 1 and 5);
  end if;
end $$;

drop policy if exists "Users can delete own product reviews" on public.product_reviews;
create policy "Users can delete own product reviews"
on public.product_reviews for delete
to authenticated
using (auth.uid() = user_id);

insert into public.product_reviews (
  user_id,
  product_id,
  title,
  body,
  status,
  created_at,
  updated_at,
  sentiment,
  legacy_post_id
)
select distinct on (p.author_id, ps.subject_id)
  p.author_id,
  ps.subject_id,
  nullif(p.title, ''),
  coalesce(nullif(p.body, ''), nullif(p.title, ''), 'Review'),
  case when p.status in ('published', 'archived') then 'published' else 'hidden' end,
  p.created_at,
  p.updated_at,
  'recommended',
  p.id
from public.posts p
join public.post_subjects ps on ps.post_id = p.id
where p.post_type = 'review'
  and ps.subject_type = 'product'
  and p.author_id is not null
order by p.author_id, ps.subject_id, p.created_at desc
on conflict (user_id, product_id) do update
set title = coalesce(excluded.title, public.product_reviews.title),
    body = excluded.body,
    status = excluded.status,
    updated_at = greatest(public.product_reviews.updated_at, excluded.updated_at),
    legacy_post_id = coalesce(public.product_reviews.legacy_post_id, excluded.legacy_post_id);

-- Updates are owned-library-domain content, not social posts.
create table if not exists public.product_updates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  version_label text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  legacy_post_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_updates_product_id_idx on public.product_updates (product_id, created_at desc);
create index if not exists product_updates_author_id_idx on public.product_updates (author_id);

alter table public.product_updates enable row level security;

drop policy if exists product_updates_read_creator_or_owner on public.product_updates;
create policy product_updates_read_creator_or_owner
on public.product_updates for select
to authenticated
using (
  author_id = auth.uid()
  or (
    status = 'published'
    and exists (
      select 1 from public.library_items li
      where li.product_id = product_updates.product_id
        and li.user_id = auth.uid()
        and li.status <> 'hidden'
    )
  )
);

drop policy if exists product_updates_insert_own_product on public.product_updates;
create policy product_updates_insert_own_product
on public.product_updates for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid())
);

drop policy if exists product_updates_update_own_product on public.product_updates;
create policy product_updates_update_own_product
on public.product_updates for update
to authenticated
using (author_id = auth.uid())
with check (
  author_id = auth.uid()
  and exists (select 1 from public.products p where p.id = product_id and p.author_id = auth.uid())
);

drop policy if exists product_updates_delete_own_product on public.product_updates;
create policy product_updates_delete_own_product
on public.product_updates for delete
to authenticated
using (author_id = auth.uid());

insert into public.product_updates (
  product_id,
  author_id,
  title,
  body,
  status,
  legacy_post_id,
  created_at,
  updated_at
)
select
  ps.subject_id,
  p.author_id,
  coalesce(nullif(p.title, ''), 'Update'),
  p.body,
  case when p.status in ('draft', 'published', 'archived') then p.status else 'published' end,
  p.id,
  p.created_at,
  p.updated_at
from public.posts p
join public.post_subjects ps on ps.post_id = p.id
where p.post_type = 'update'
  and ps.subject_type = 'product'
  and p.author_id is not null
on conflict (legacy_post_id) do update
set title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    updated_at = excluded.updated_at;

-- User-owned OS preferences replacing localStorage over time.
create table if not exists public.user_os_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('light', 'dark', 'system')),
  theme_accent text not null default 'amber' check (theme_accent in ('amber', 'sage', 'ocean', 'violet')),
  landing_app text,
  dock_mode text not null default 'full' check (dock_mode in ('full', 'compact')),
  motion_mode text not null default 'system' check (motion_mode in ('system', 'reduced')),
  active_workspace_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_os_preferences enable row level security;

drop policy if exists user_os_preferences_owner_all on public.user_os_preferences;
create policy user_os_preferences_owner_all
on public.user_os_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_app_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id text not null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

alter table public.user_app_preferences enable row level security;

drop policy if exists user_app_preferences_owner_all on public.user_app_preferences;
create policy user_app_preferences_owner_all
on public.user_app_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
