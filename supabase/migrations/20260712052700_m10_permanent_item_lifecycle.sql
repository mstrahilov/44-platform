-- M10: permanent Item lifecycle.
-- Creator removal archives an Item and its offers instead of erasing the
-- permanent Item ID, Library relationships, entitlements, or audit history.

drop policy if exists products_delete_own on public.catalog_items;
revoke delete on public.catalog_items from anon, authenticated;

drop policy if exists products_update_own on public.catalog_items;
create policy products_update_own on public.catalog_items
for update to authenticated
using (author_id=auth.uid() and status<>'archived')
with check (author_id=auth.uid() and status in ('draft','published'));

drop policy if exists products_read on public.catalog_items;
create policy products_read on public.catalog_items
for select
using (
  author_id=auth.uid()
  or status='published'
  or (
    status='archived'
    and auth.uid() is not null
    and public.has_item_entitlement(auth.uid(),id,'library_access')
  )
);

drop policy if exists "Public can read product tracks" on public.tracks;
drop policy if exists tracks_read on public.tracks;
create policy tracks_read on public.tracks
for select
using (
  exists(
    select 1
    from public.catalog_items item
    where item.id=tracks.item_id
      and (
        item.author_id=auth.uid()
        or item.status='published'
        or (
          item.status='archived'
          and auth.uid() is not null
          and public.has_item_entitlement(auth.uid(),item.id,'library_access')
        )
      )
  )
);

drop policy if exists "Public can read product achievements" on public.item_achievements;
create policy item_achievements_read on public.item_achievements
for select
using (
  exists(
    select 1
    from public.catalog_items item
    where item.id=item_achievements.item_id
      and (
        item.author_id=auth.uid()
        or item.status='published'
        or (
          item.status='archived'
          and auth.uid() is not null
          and public.has_item_entitlement(auth.uid(),item.id,'library_access')
        )
      )
  )
);

drop policy if exists product_updates_read_creator_or_owner on public.product_updates;
create policy product_updates_read_creator_or_owner on public.product_updates
for select to authenticated
using (
  author_id=auth.uid()
  or (
    status='published'
    and public.has_item_entitlement(auth.uid(),item_id,'library_access')
    and exists(
      select 1 from public.catalog_items item
      where item.id=product_updates.item_id
        and item.status in ('published','archived')
    )
  )
);

create or replace function public.archive_owned_item(target_item_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  active_user uuid := auth.uid();
  current_status text;
begin
  if active_user is null then
    raise exception 'authentication required';
  end if;

  select item.status into current_status
  from public.catalog_items item
  where item.id=target_item_id and item.author_id=active_user
  for update;

  if current_status is null then
    raise exception 'Item not found or not owned by active creator';
  end if;
  if current_status='archived' then
    return 'archived';
  end if;

  update public.catalog_items
  set status='archived', updated_at=now()
  where id=target_item_id and author_id=active_user;

  update public.catalog_offers
  set status='archived', updated_at=now()
  where item_id=target_item_id and status<>'archived';

  return 'archived';
end;
$$;

revoke all on function public.archive_owned_item(uuid) from public, anon;
grant execute on function public.archive_owned_item(uuid) to authenticated, service_role;

comment on function public.archive_owned_item(uuid) is
  'Archives a creator-owned Item and its offers while preserving permanent identity, Library access, entitlements, and audit history.';
