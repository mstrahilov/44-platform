create or replace function public.youtube_video_id_from_url(target_url text)
returns text language plpgsql immutable security definer set search_path=public as $$
declare normalized text := nullif(btrim(target_url),''); video_id text;
begin
  if normalized is null then return null; end if;
  if normalized ~* '^https://(www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}(&.*)?$' then
    video_id := substring(normalized from 'v=([A-Za-z0-9_-]{11})');
  elsif normalized ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}(\?.*)?$' then
    video_id := substring(normalized from 'youtu\.be/([A-Za-z0-9_-]{11})');
  elsif normalized ~* '^https://(www\.)?youtube\.com/(shorts|embed)/[A-Za-z0-9_-]{11}(\?.*)?$' then
    video_id := substring(normalized from '(shorts|embed)/([A-Za-z0-9_-]{11})');
    video_id := substring(normalized from '/([A-Za-z0-9_-]{11})(\?.*)?$');
  end if;
  return video_id;
end;
$$;
