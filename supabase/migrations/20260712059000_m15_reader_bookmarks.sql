-- M15 reader bookmarks: entitlement-gated, synchronized, and server-authoritative.
create table public.reading_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id),
  page_number integer not null check (page_number > 0),
  created_at timestamptz not null default now(),
  unique(user_id,item_id,page_number)
);

create index reading_bookmarks_user_item_idx on public.reading_bookmarks(user_id,item_id,page_number);

alter table public.reading_bookmarks enable row level security;
create policy reading_bookmarks_owner_read on public.reading_bookmarks for select to authenticated
using (user_id=auth.uid());

revoke insert,update,delete on public.reading_bookmarks from anon,authenticated;
grant select on public.reading_bookmarks to authenticated;
grant all on public.reading_bookmarks to service_role;

create or replace function public.toggle_reading_bookmark(target_item_id uuid,target_page integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  active_user uuid:=auth.uid();
  safe_page integer;
  known_pages integer;
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not public.has_item_entitlement(active_user,target_item_id,'read') and not public.can_manage_item(target_item_id) then
    raise exception 'active read access required' using errcode='42501';
  end if;
  select total_pages into known_pages from public.book_contents where item_id=target_item_id;
  if not found then raise exception 'book reader content not found' using errcode='P0002'; end if;
  safe_page:=greatest(1,case when known_pages is null then target_page else least(target_page,known_pages) end);

  delete from public.reading_bookmarks
  where user_id=active_user and item_id=target_item_id and page_number=safe_page;
  if found then return false; end if;

  insert into public.reading_bookmarks(user_id,item_id,page_number)
  values(active_user,target_item_id,safe_page);
  return true;
end;
$$;

grant execute on function public.toggle_reading_bookmark(uuid,integer) to authenticated,service_role;
revoke execute on function public.toggle_reading_bookmark(uuid,integer) from public,anon;
comment on function public.toggle_reading_bookmark(uuid,integer) is 'Adds or removes a synchronized PDF page bookmark only while active read access exists.';
