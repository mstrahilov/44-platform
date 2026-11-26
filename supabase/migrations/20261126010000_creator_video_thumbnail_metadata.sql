-- Persist the current YouTube thumbnail URL alongside the title/date metadata.
-- The UI still keeps an ID-based fallback for older or unavailable videos.
alter table public.creator_videos
  add column if not exists youtube_thumbnail_url text;

comment on column public.creator_videos.youtube_thumbnail_url is
  'Latest HTTPS thumbnail URL returned by YouTube oEmbed or the Data API; refreshed by the scheduled video metadata worker.';

create or replace function public.browse_videos_v1(
  cursor jsonb default null,
  "limit" integer default 30
) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare
  bounded_limit integer := least(greatest(coalesce("limit",30),1),60);
  page_offset integer := least(greatest(coalesce((cursor->>'offset')::integer,0),0),10000);
  result jsonb;
begin
  select jsonb_build_object(
    'contract_version', 1,
    'items', coalesce(jsonb_agg(row_to_json(v)), '[]'::jsonb),
    'next_cursor', case when count(*) over () > page_offset + bounded_limit
      then jsonb_build_object('offset', page_offset + bounded_limit) else null end
  ) into result
  from (
    select cv.id, cv.title, cv.youtube_video_id, cv.youtube_thumbnail_url, cv.creator_id, cv.created_at,
           p.username, p.display_name, p.avatar_url, p.slug
    from public.creator_videos cv
    join public.profiles p on p.id = cv.creator_id
    order by coalesce(cv.youtube_published_at, cv.created_at) desc
    limit bounded_limit offset page_offset
  ) v;
  return result;
end;
$$;

grant execute on function public.browse_videos_v1(jsonb,integer) to anon,authenticated;
