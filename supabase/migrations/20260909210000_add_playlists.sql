-- Playlists: a member's own ordered collection of tracks, independent of
-- any single release. A track can only be added to a playlist while the
-- member still has library_access to the track's item — playback
-- authorization for a playlist track always re-checks that same
-- entitlement at read time, so playlists never become a way to bypass
-- normal library/commerce access.

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index playlists_user_idx on public.playlists(user_id, created_at desc);

alter table public.playlists enable row level security;

create policy playlists_owner_all on public.playlists
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.playlists to authenticated;

create table public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  sort_order integer not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, track_id)
);

create index playlist_tracks_playlist_idx on public.playlist_tracks(playlist_id, sort_order);

alter table public.playlist_tracks enable row level security;

-- Row access follows the owning playlist, not a separate user_id column on
-- this table — a member can only see/modify tracks in playlists they own.
create policy playlist_tracks_owner_all on public.playlist_tracks
  for all to authenticated
  using (exists (
    select 1 from public.playlists playlist
    where playlist.id = playlist_tracks.playlist_id and playlist.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.playlists playlist
    where playlist.id = playlist_tracks.playlist_id and playlist.user_id = auth.uid()
  ));

grant select, insert, update, delete on public.playlist_tracks to authenticated;

-- Adds a track to a playlist, creating the playlist first if `target_playlist_id`
-- is omitted — the "no playlists yet, create one and add this track in the
-- same step" path the app's "Add to Playlist" sheet uses. Re-checks
-- library_access on the track's item so a track can never be added to a
-- playlist unless the caller actually owns it right now.
create or replace function public.add_track_to_playlist(
  target_track_id uuid,
  target_playlist_id uuid default null,
  new_playlist_title text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  active_user uuid := auth.uid();
  owning_item_id uuid;
  resolved_playlist_id uuid;
  next_sort_order integer;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  select item_id into owning_item_id from public.tracks where id = target_track_id;
  if owning_item_id is null then raise exception 'Track not found.'; end if;
  if not public.has_item_entitlement(active_user, owning_item_id, 'library_access') then
    raise exception 'Library access required to add this track to a playlist.';
  end if;

  if target_playlist_id is not null then
    select id into resolved_playlist_id from public.playlists
    where id = target_playlist_id and user_id = active_user;
    if resolved_playlist_id is null then raise exception 'Playlist not found.'; end if;
  else
    insert into public.playlists (user_id, title)
    values (active_user, coalesce(nullif(btrim(new_playlist_title), ''), 'New Playlist'))
    returning id into resolved_playlist_id;
  end if;

  select coalesce(max(sort_order) + 1, 0) into next_sort_order
  from public.playlist_tracks where playlist_id = resolved_playlist_id;

  insert into public.playlist_tracks (playlist_id, track_id, sort_order)
  values (resolved_playlist_id, target_track_id, next_sort_order)
  on conflict (playlist_id, track_id) do nothing;

  update public.playlists set updated_at = now() where id = resolved_playlist_id;

  return resolved_playlist_id;
end;
$$;

revoke all on function public.add_track_to_playlist(uuid, uuid, text) from public, anon;
grant execute on function public.add_track_to_playlist(uuid, uuid, text) to authenticated;

-- Persists a full reorder/add/remove edit in one call — the client sends the
-- complete desired track_id list in the new order; this replaces the
-- playlist's rows to match exactly, re-checking library_access for every
-- track the same way add_track_to_playlist does.
create or replace function public.replace_playlist_tracks(
  target_playlist_id uuid,
  track_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_user uuid := auth.uid();
  playlist_owner uuid;
  track_id uuid;
  item_id uuid;
  position integer := 0;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  select user_id into playlist_owner from public.playlists where id = target_playlist_id;
  if playlist_owner is distinct from active_user then raise exception 'Playlist not found.'; end if;

  foreach track_id in array coalesce(track_ids, '{}'::uuid[]) loop
    select t.item_id into item_id from public.tracks t where t.id = track_id;
    if item_id is null or not public.has_item_entitlement(active_user, item_id, 'library_access') then
      raise exception 'Library access required for every track in this playlist.';
    end if;
  end loop;

  delete from public.playlist_tracks where playlist_id = target_playlist_id;

  foreach track_id in array coalesce(track_ids, '{}'::uuid[]) loop
    insert into public.playlist_tracks (playlist_id, track_id, sort_order)
    values (target_playlist_id, track_id, position);
    position := position + 1;
  end loop;

  update public.playlists set updated_at = now() where id = target_playlist_id;
end;
$$;

revoke all on function public.replace_playlist_tracks(uuid, uuid[]) from public, anon;
grant execute on function public.replace_playlist_tracks(uuid, uuid[]) to authenticated;
