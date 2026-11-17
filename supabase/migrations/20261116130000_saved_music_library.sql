-- Saved music relationships are separate from library_entries/entitlements.
-- They record collection membership and never authorize downloads.
create table public.saved_music_tracks (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index saved_music_tracks_user_saved_idx on public.saved_music_tracks(user_id, saved_at desc);
alter table public.saved_music_tracks enable row level security;
create policy saved_music_tracks_owner_read on public.saved_music_tracks
  for select to authenticated using (user_id = auth.uid());
grant select on public.saved_music_tracks to authenticated;
revoke insert, update, delete on public.saved_music_tracks from public, anon, authenticated;

-- Preserve existing saved free music releases as complete release saves.
insert into public.saved_music_tracks(user_id, track_id, saved_at)
select entry.user_id, track.id, entry.acquired_at
from public.library_entries entry
join public.catalog_items item on item.id = entry.item_id
join public.tracks track on track.item_id = item.id
where item.experience_type = 'music' and item.status = 'published'
  and entry.status = 'visible'
on conflict (user_id, track_id) do nothing;

create or replace function public.set_saved_music_track(target_track_id uuid, should_save boolean)
returns void language plpgsql security definer set search_path = public as $$
declare active_user uuid := auth.uid();
begin
  if active_user is null then raise exception 'authentication required'; end if;
  if should_save then
    if not exists (
      select 1 from public.tracks track join public.catalog_items item on item.id = track.item_id
      where track.id = target_track_id and item.status = 'published'
        and item.experience_type = 'music' and item.streaming_enabled and track.audio_url is not null
    ) then raise exception 'Published playable track not found.'; end if;
    insert into public.saved_music_tracks(user_id, track_id) values(active_user, target_track_id)
      on conflict(user_id, track_id) do nothing;
  else
    delete from public.saved_music_tracks where user_id = active_user and track_id = target_track_id;
  end if;
end $$;

create or replace function public.set_saved_music_release(target_item_id uuid, should_save boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare active_user uuid := auth.uid(); affected integer;
begin
  if active_user is null then raise exception 'authentication required'; end if;
  if should_save then
    if not exists (select 1 from public.catalog_items item where item.id = target_item_id
      and item.status = 'published' and item.experience_type = 'music' and item.streaming_enabled) then
      raise exception 'Published playable release not found.';
    end if;
    insert into public.saved_music_tracks(user_id, track_id, saved_at)
      select active_user, track.id, now() from public.tracks track
      where track.item_id = target_item_id
      on conflict(user_id, track_id) do nothing;
    get diagnostics affected = row_count;
  else
    delete from public.saved_music_tracks saved using public.tracks track
      where saved.track_id = track.id and track.item_id = target_item_id and saved.user_id = active_user;
    get diagnostics affected = row_count;
  end if;
  return affected;
end $$;

-- Atomic release playlist action: published/playable tracks in release order,
-- de-duplicated against the existing playlist, with existing access checks.
create or replace function public.add_release_to_playlist(target_item_id uuid, target_playlist_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare active_user uuid := auth.uid(); playlist_owner uuid; next_order integer; affected integer;
begin
  if active_user is null then raise exception 'authentication required'; end if;
  select user_id into playlist_owner from public.playlists where id = target_playlist_id;
  if playlist_owner is distinct from active_user then raise exception 'Playlist not found.'; end if;
  if not exists (select 1 from public.catalog_items item where item.id = target_item_id
      and item.status = 'published' and item.experience_type = 'music' and item.streaming_enabled) then
    raise exception 'Published release not found.';
  end if;
  select coalesce(max(sort_order) + 1, 0) into next_order from public.playlist_tracks where playlist_id = target_playlist_id;
  insert into public.playlist_tracks(playlist_id, track_id, sort_order)
    select target_playlist_id, track.id, next_order + row_number() over(order by track.number, track.id) - 1
    from public.tracks track
    where track.item_id = target_item_id
      and exists (select 1 from public.catalog_items item where item.id = track.item_id and item.status = 'published')
    on conflict(playlist_id, track_id) do nothing;
  get diagnostics affected = row_count;
  if affected > 0 then update public.playlists set updated_at = now() where id = target_playlist_id; end if;
  return affected;
end $$;

revoke all on function public.set_saved_music_track(uuid, boolean), public.set_saved_music_release(uuid, boolean), public.add_release_to_playlist(uuid, uuid) from public, anon;
grant execute on function public.set_saved_music_track(uuid, boolean), public.set_saved_music_release(uuid, boolean), public.add_release_to_playlist(uuid, uuid) to authenticated;
