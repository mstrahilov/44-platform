-- 44OS author-owned content RLS
-- Run this after the users/profiles consolidation migration.
-- profiles.id is the auth user id, and products/services/resources are owned
-- through author_id.

alter table public.products enable row level security;
alter table public.services enable row level security;
alter table public.resources enable row level security;

drop policy if exists "products_read" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;
drop policy if exists "Public products are readable" on public.products;

create policy "products_read"
  on public.products
  for select
  using (
    author_id = auth.uid()
    or status = 'published'
    or is_published = true
  );

create policy "products_insert_own"
  on public.products
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "products_update_own"
  on public.products
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "products_delete_own"
  on public.products
  for delete
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "services_read" on public.services;
drop policy if exists "services_insert_own" on public.services;
drop policy if exists "services_update_own" on public.services;
drop policy if exists "services_delete_own" on public.services;
drop policy if exists "Public services are readable" on public.services;

create policy "services_read"
  on public.services
  for select
  using (
    author_id = auth.uid()
    or status = 'published'
  );

create policy "services_insert_own"
  on public.services
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "services_update_own"
  on public.services
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "services_delete_own"
  on public.services
  for delete
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "resources_read" on public.resources;
drop policy if exists "resources_insert_own" on public.resources;
drop policy if exists "resources_update_own" on public.resources;
drop policy if exists "resources_delete_own" on public.resources;
drop policy if exists "Public resources are readable" on public.resources;

create policy "resources_read"
  on public.resources
  for select
  using (
    author_id = auth.uid()
    or status = 'published'
  );

create policy "resources_insert_own"
  on public.resources
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "resources_update_own"
  on public.resources
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "resources_delete_own"
  on public.resources
  for delete
  to authenticated
  using (author_id = auth.uid());
