-- Supports the Studio video editor: editing a library video's title/URL,
-- and attaching/detaching it to releases one at a time from the video's own
-- page (as opposed to replace_owned_item_video_attachments's full-replace,
-- which stays the release-side "save this whole attached set" path).

create or replace function public.update_creator_video(
  target_video_id uuid,
  p_title text,
  p_url text,
  p_published_at timestamptz default null
) returns table(id uuid, title text, youtube_video_id text, youtube_published_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  parsed_id text;
  resolved_title text;
begin
  if not exists(
    select 1 from public.creator_videos where creator_videos.id = target_video_id and creator_id = auth.uid()
  ) then
    raise exception 'Video management required.' using errcode='42501';
  end if;

  parsed_id := public.youtube_video_id_from_url(p_url);
  if parsed_id is null then
    raise exception 'Only valid HTTPS YouTube video URLs are accepted.' using errcode='22023';
  end if;

  resolved_title := left(coalesce(nullif(btrim(p_title),''), 'YouTube video'), 120);

  update public.creator_videos
  set title = resolved_title,
      youtube_video_id = parsed_id,
      youtube_published_at = p_published_at
  where creator_videos.id = target_video_id;

  return query
    select creator_videos.id, creator_videos.title, creator_videos.youtube_video_id, creator_videos.youtube_published_at
    from public.creator_videos where creator_videos.id = target_video_id;
end;
$$;
grant execute on function public.update_creator_video(uuid,text,text,timestamptz) to authenticated;

create or replace function public.attach_creator_video_to_item(target_item_id uuid, target_video_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  item_author uuid;
  next_order integer;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item management required.' using errcode='42501';
  end if;

  select author_id into item_author from public.catalog_items where id = target_item_id;
  if not exists(select 1 from public.creator_videos v where v.id = target_video_id and v.creator_id = item_author) then
    raise exception 'A video can only be attached to a release by its own creator.' using errcode='42501';
  end if;

  if exists(select 1 from public.item_video_attachments where item_id = target_item_id and video_id = target_video_id) then
    return;
  end if;

  select coalesce(max(sort_order) + 1, 0) into next_order
  from public.item_video_attachments where item_id = target_item_id;

  if next_order >= 10 then
    raise exception 'Up to ten videos may be attached to a release.' using errcode='22023';
  end if;

  insert into public.item_video_attachments(item_id, video_id, sort_order)
  values (target_item_id, target_video_id, next_order);
end;
$$;
grant execute on function public.attach_creator_video_to_item(uuid,uuid) to authenticated;

create or replace function public.detach_creator_video_from_item(target_item_id uuid, target_video_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item management required.' using errcode='42501';
  end if;

  delete from public.item_video_attachments
  where item_id = target_item_id and video_id = target_video_id;
end;
$$;
grant execute on function public.detach_creator_video_from_item(uuid,uuid) to authenticated;
