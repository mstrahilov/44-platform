begin;

-- Resources were replaced by Community Questions. Remove the old domain from
-- shared event/activity tables before dropping its dedicated tables.
alter table public.achievement_events
  drop column if exists resource_id;

alter table public.library_activity
  drop column if exists resource_id;

drop table if exists public.saved_resources;
drop table if exists public.resource_components;
drop table if exists public.resources;

delete from public.item_components where scope = 'resources';
alter table public.item_components
  drop constraint if exists item_components_scope_check;
alter table public.item_components
  add constraint item_components_scope_check
  check (scope = any (array['products'::text, 'services'::text]));

delete from public.categories where scope = 'resources';
alter table public.categories
  drop constraint if exists categories_scope_check;
alter table public.categories
  add constraint categories_scope_check
  check (scope = any (array['products'::text, 'services'::text, 'posts'::text, 'creators'::text]));

-- Services are not a launch feature. Preserve the catalog rows for future
-- product-model migration, but remove the abandoned request/project system.
drop table if exists public.project_messages;
drop table if exists public.service_requests;
drop table if exists public.service_components;

drop policy if exists "services_read" on public.services;
drop policy if exists "services_insert_own" on public.services;
drop policy if exists "services_update_own" on public.services;
drop policy if exists "services_delete_own" on public.services;

create policy "services_admin_all"
on public.services
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

comment on table public.services is
'Private placeholder catalog for future service offerings. Not a launch surface. Future services should migrate into the canonical products model with service fulfillment.';

commit;
