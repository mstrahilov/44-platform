-- Add every existing track that is not already represented in Radio.
-- Existing playlist entries keep their order; missing tracks append in stable
-- release/track order. The unique track_id constraint makes this idempotent.

with playlist_tail as (
  select coalesce(max(sort_order), -1) as last_sort_order
  from public.radio_playlist_entries
), missing_tracks as (
  select
    track.id,
    row_number() over (
      order by item.created_at, item.id, track.number nulls last, track.created_at, track.id
    ) - 1 as offset
  from public.tracks track
  join public.catalog_items item on item.id = track.item_id
  where not exists (
    select 1
    from public.radio_playlist_entries playlist
    where playlist.track_id = track.id
  )
)
insert into public.radio_playlist_entries (track_id, sort_order, is_active)
select missing.id, tail.last_sort_order + missing.offset + 1, true
from missing_tracks missing
cross join playlist_tail tail
on conflict (track_id) do nothing;
