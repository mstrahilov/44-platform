-- Keep the playlist catalog picker consistent across native and web clients.
-- A playlist may reference any published track; this does not grant Library
-- or download access to the referenced Item.

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
  resolved_playlist_id uuid;
  next_sort_order integer;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  if not exists (
    select 1
    from public.tracks track
    join public.catalog_items item on item.id = track.item_id
    where track.id = target_track_id and item.status = 'published'
  ) then
    raise exception 'Only published tracks can be added to a playlist.';
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
  requested_track_id uuid;
  track_status text;
  position integer := 0;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  select user_id into playlist_owner from public.playlists where id = target_playlist_id;
  if playlist_owner is distinct from active_user then raise exception 'Playlist not found.'; end if;

  if cardinality(coalesce(track_ids, '{}'::uuid[])) <> (
    select count(distinct candidate)::integer
    from unnest(coalesce(track_ids, '{}'::uuid[])) as candidate
  ) then
    raise exception 'A playlist cannot contain the same track more than once.';
  end if;

  foreach requested_track_id in array coalesce(track_ids, '{}'::uuid[]) loop
    select item.status into track_status
    from public.tracks track
    join public.catalog_items item on item.id = track.item_id
    where track.id = requested_track_id;

    if track_status is null or (
      track_status <> 'published'
      and not exists (
        select 1 from public.playlist_tracks existing
        where existing.playlist_id = target_playlist_id and existing.track_id = requested_track_id
      )
    ) then
      raise exception 'Only published tracks or tracks already in this playlist can be saved.';
    end if;
  end loop;

  delete from public.playlist_tracks where playlist_id = target_playlist_id;

  foreach requested_track_id in array coalesce(track_ids, '{}'::uuid[]) loop
    insert into public.playlist_tracks (playlist_id, track_id, sort_order)
    values (target_playlist_id, requested_track_id, position);
    position := position + 1;
  end loop;

  update public.playlists set updated_at = now() where id = target_playlist_id;
end;
$$;

revoke all on function public.replace_playlist_tracks(uuid, uuid[]) from public, anon;
grant execute on function public.replace_playlist_tracks(uuid, uuid[]) to authenticated;

-- Correct the v1 browse cursor: the prior aggregate counted only the current
-- page, so a full first page incorrectly returned no next_cursor.
create or replace function public.browse_all_tracks_v1(
  search_query text default '',
  cursor jsonb default null,
  "limit" integer default 30
) returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  bounded_limit integer := least(greatest(coalesce("limit", 30), 1), 60);
  page_offset integer := least(greatest(coalesce((cursor->>'offset')::integer, 0), 0), 200000);
  normalized_query text := nullif(btrim(search_query), '');
  active_user uuid := auth.uid();
  result jsonb;
begin
  with matching as (
    select track.id as track_id,
           track.item_id,
           track.title,
           track.duration_seconds,
           track.audio_url,
           item.title as item_title,
           item.creator,
           item.cover_url,
           item.hero_url,
           public.has_item_entitlement(active_user, track.item_id, 'library_access') as has_access,
           count(*) over () as total_count
    from public.tracks track
    join public.catalog_items item on item.id = track.item_id
    where item.status = 'published'
      and (
        normalized_query is null
        or track.title ilike '%' || normalized_query || '%'
        or item.title ilike '%' || normalized_query || '%'
        or item.creator ilike '%' || normalized_query || '%'
      )
  ), page as (
    select * from matching
    order by title asc, track_id asc
    limit bounded_limit offset page_offset
  )
  select jsonb_build_object(
    'contract_version', 1,
    'items', coalesce(jsonb_agg(to_jsonb(page) - 'total_count' order by page.title asc, page.track_id asc), '[]'::jsonb),
    'next_cursor', case when coalesce(max(total_count), 0) > page_offset + bounded_limit
      then jsonb_build_object('offset', page_offset + bounded_limit) else null end
  ) into result
  from page;

  return result;
end;
$$;

revoke all on function public.browse_all_tracks_v1(text, jsonb, integer) from public, anon;
grant execute on function public.browse_all_tracks_v1(text, jsonb, integer) to authenticated;
