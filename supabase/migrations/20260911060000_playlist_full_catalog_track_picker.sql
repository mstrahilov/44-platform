-- Lets a member add any track on 44 to one of their own playlists — an
-- Instagram-style "pick a song from the whole catalog" picker — not just
-- tracks they already have library access to.
--
-- This is safe because playback authorization for a playlist track always
-- re-checks library_access at play time (see the original playlists
-- migration's own comment). Removing the entitlement check here only
-- changes what a playlist can *reference*, never what it can actually
-- play — an added-but-unowned track simply stays locked until the member
-- gets access some other way, same as it always would.

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

-- Flat, searchable, paginated catalog-wide track browse for the picker.
-- `has_access` lets the client show an unowned track as locked/dimmed
-- rather than pretending every track is equally playable once added.
create or replace function public.browse_all_tracks_v1(
  search_query text default '',
  cursor jsonb default null,
  "limit" integer default 30
) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare
  bounded_limit integer := least(greatest(coalesce("limit",30),1),60);
  page_offset integer := least(greatest(coalesce((cursor->>'offset')::integer,0),0),200000);
  normalized_query text := nullif(btrim(search_query), '');
  active_user uuid := auth.uid();
  result jsonb;
begin
  select jsonb_build_object(
    'contract_version', 1,
    'items', coalesce(jsonb_agg(row_to_json(v)), '[]'::jsonb),
    'next_cursor', case when count(*) over () > page_offset + bounded_limit
      then jsonb_build_object('offset', page_offset + bounded_limit) else null end
  ) into result
  from (
    select t.id as track_id, t.item_id, t.title, t.duration_seconds, t.audio_url,
           ci.title as item_title, ci.creator, ci.cover_url, ci.hero_url,
           public.has_item_entitlement(active_user, t.item_id, 'library_access') as has_access
    from public.tracks t
    join public.catalog_items ci on ci.id = t.item_id
    where ci.status = 'published'
      and (
        normalized_query is null
        or t.title ilike '%' || normalized_query || '%'
        or ci.title ilike '%' || normalized_query || '%'
        or ci.creator ilike '%' || normalized_query || '%'
      )
    order by t.title asc, t.id asc
    limit bounded_limit offset page_offset
  ) v;
  return result;
end;
$$;
grant execute on function public.browse_all_tracks_v1(text,jsonb,integer) to authenticated;
