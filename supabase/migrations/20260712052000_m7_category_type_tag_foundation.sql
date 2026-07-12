-- M7 refinement: immutable system Categories with separately managed Types and Tags.

create table public.item_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.item_categories(id) on delete restrict,
  label text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table public.item_tags (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.item_categories(id) on delete restrict,
  item_type_id uuid references public.item_types(id) on delete set null,
  label text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table public.item_type_assignments (
  item_id uuid primary key references public.catalog_items(id) on delete cascade,
  item_type_id uuid not null references public.item_types(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.item_tag_assignments (
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  item_tag_id uuid not null references public.item_tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (item_id, item_tag_id)
);

alter table public.item_types enable row level security;
alter table public.item_tags enable row level security;
alter table public.item_type_assignments enable row level security;
alter table public.item_tag_assignments enable row level security;

create policy item_types_read on public.item_types for select using (is_active = true);
create policy item_tags_read on public.item_tags for select using (is_active = true);
create policy item_types_admin on public.item_types for all to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));
create policy item_tags_admin on public.item_tags for all to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'admin'));
create policy item_type_assignments_read on public.item_type_assignments for select using (true);
create policy item_tag_assignments_read on public.item_tag_assignments for select using (true);
create policy item_type_assignments_manage on public.item_type_assignments for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));
create policy item_tag_assignments_manage on public.item_tag_assignments for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

grant select on public.item_types, public.item_tags, public.item_type_assignments, public.item_tag_assignments to anon, authenticated;
grant insert, update, delete on public.item_types, public.item_tags, public.item_type_assignments, public.item_tag_assignments to authenticated;

insert into public.item_types (id, category_id, label, slug, sort_order, is_active, created_at, updated_at)
select term.id, category.id, term.label, term.slug, term.sort_order, term.is_active, term.created_at, term.updated_at
from public.catalog_taxonomy_terms term
join public.item_categories category on category.slug = case term.experience_type
  when 'book' then 'books'
  when 'physical' then 'merch'
  else term.experience_type
end
where term.level = 'type'
on conflict do nothing;

insert into public.item_tags (id, category_id, item_type_id, label, slug, sort_order, is_active, created_at, updated_at)
select term.id, category.id, term.parent_id, term.label, term.slug, term.sort_order, term.is_active, term.created_at, term.updated_at
from public.catalog_taxonomy_terms term
join public.item_categories category on category.slug = case term.experience_type
  when 'book' then 'books'
  when 'physical' then 'merch'
  else term.experience_type
end
where term.level = 'tag'
on conflict do nothing;

insert into public.item_type_assignments (item_id, item_type_id, created_at)
select distinct on (assignment.item_id) assignment.item_id, assignment.term_id, assignment.created_at
from public.item_taxonomy_terms assignment
join public.catalog_taxonomy_terms term on term.id = assignment.term_id and term.level = 'type'
order by assignment.item_id, term.sort_order, term.id
on conflict (item_id) do update set item_type_id = excluded.item_type_id;

insert into public.item_tag_assignments (item_id, item_tag_id, created_at)
select assignment.item_id, assignment.term_id, assignment.created_at
from public.item_taxonomy_terms assignment
join public.catalog_taxonomy_terms term on term.id = assignment.term_id and term.level = 'tag'
on conflict do nothing;

comment on table public.item_categories is '44OS system-defined Categories. Application migrations own these rows; admins do not edit them.';
comment on table public.item_types is 'Admin-managed Types scoped to one system Category.';
comment on table public.item_tags is 'Admin-managed approved Tags scoped to a Category and optionally a Type.';
