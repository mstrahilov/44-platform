-- Sort Home's Videos tab by the video's real YouTube upload date rather
-- than when it was added to a creator's library. The date itself is fetched
-- server-side by the save-creator-video Edge Function (YouTube Data API v3
-- has no public, keyless endpoint for it — oEmbed only returns title/author/
-- thumbnail) and passed through here; nil until that fetch completes or if
-- it ever fails, in which case ordering falls back to created_at.

alter table public.creator_videos
  add column youtube_published_at timestamptz;

create or replace function public.save_creator_video(
  p_title text,
  p_url text,
  p_published_at timestamptz default null
)
returns table(id uuid, title text, youtube_video_id text, youtube_published_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  active_user uuid := auth.uid();
  parsed_id text;
  resolved_title text;
  new_id uuid;
begin
  if active_user is null then
    raise exception 'Sign in required.' using errcode='42501';
  end if;

  parsed_id := public.youtube_video_id_from_url(p_url);
  if parsed_id is null then
    raise exception 'Only valid HTTPS YouTube video URLs are accepted.' using errcode='22023';
  end if;

  resolved_title := left(coalesce(nullif(btrim(p_title),''), 'YouTube video'), 120);

  insert into public.creator_videos(creator_id, title, youtube_video_id, youtube_published_at)
  values (active_user, resolved_title, parsed_id, p_published_at)
  returning creator_videos.id into new_id;

  return query select new_id, resolved_title, parsed_id, p_published_at;
end;
$$;
grant execute on function public.save_creator_video(text,text,timestamptz) to authenticated;

-- A creator can't call this themselves (it would let anyone backdate any
-- video); only the save-creator-video Edge Function's service-role call
-- reaches it, immediately after the row exists, to attach the fetched date
-- without re-running the ownership/validation logic above.
create or replace function public.set_creator_video_published_at(
  target_video_id uuid,
  published_at timestamptz
) returns void language sql security definer set search_path=public as $$
  update public.creator_videos set youtube_published_at = published_at where id = target_video_id;
$$;
grant execute on function public.set_creator_video_published_at(uuid,timestamptz) to service_role;

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
    select cv.id, cv.title, cv.youtube_video_id, cv.creator_id, cv.created_at,
           p.username, p.display_name, p.avatar_url, p.slug
    from public.creator_videos cv
    join public.profiles p on p.id = cv.creator_id
    order by coalesce(cv.youtube_published_at, cv.created_at) desc
    limit bounded_limit offset page_offset
  ) v;
  return result;
end;
$$;
