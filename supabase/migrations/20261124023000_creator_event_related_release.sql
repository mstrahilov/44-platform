begin;

-- Events can optionally point at one of the creator's music releases. This is
-- intentionally a one-to-one relationship so the Studio UI can use the same
-- single-select release picker as videos, books, and games.
create table if not exists public.creator_event_related_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.creator_events(id) on delete cascade,
  related_item_id uuid not null references public.catalog_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id),
  unique(event_id, related_item_id)
);

alter table public.creator_event_related_items enable row level security;

drop policy if exists creator_event_related_items_read on public.creator_event_related_items;
create policy creator_event_related_items_read on public.creator_event_related_items
for select
using (
  exists(
    select 1
    from public.creator_events event
    where event.id = creator_event_related_items.event_id
      and (
        (event.lifecycle_state <> 'removed' and event.moderation_state = 'visible')
        or event.creator_id = auth.uid()
        or public.is_platform_admin()
      )
  )
);

drop policy if exists creator_event_related_items_manage on public.creator_event_related_items;
create policy creator_event_related_items_manage on public.creator_event_related_items
to authenticated
using (
  exists(
    select 1 from public.creator_events event
    where event.id = creator_event_related_items.event_id
      and (event.creator_id = auth.uid() or public.is_platform_admin())
  )
)
with check (
  exists(
    select 1 from public.creator_events event
    where event.id = creator_event_related_items.event_id
      and (event.creator_id = auth.uid() or public.is_platform_admin())
  )
  and public.can_manage_item(related_item_id)
);

create or replace function public.set_creator_event_related_release(
  target_event_id uuid,
  target_release_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(
    select 1 from public.creator_events
    where id = target_event_id
      and (creator_id = auth.uid() or public.is_platform_admin())
      and lifecycle_state <> 'removed'
  ) then
    raise exception 'Event not found or not editable by this account.' using errcode = '42501';
  end if;

  delete from public.creator_event_related_items
  where event_id = target_event_id;

  if target_release_id is null then
    return;
  end if;

  if not exists(
    select 1 from public.catalog_items item
    where item.id = target_release_id
      and item.experience_type = 'music'
      and item.status <> 'archived'
      and public.can_manage_item(item.id)
  ) then
    raise exception 'Related release must be one of your own music releases.' using errcode = '42501';
  end if;

  insert into public.creator_event_related_items(event_id, related_item_id)
  values (target_event_id, target_release_id);
end;
$$;

revoke all on function public.set_creator_event_related_release(uuid, uuid) from public, anon;
grant execute on function public.set_creator_event_related_release(uuid, uuid) to authenticated, service_role;

comment on table public.creator_event_related_items is 'Optional single music release attached to a creator event.';

commit;
