-- Creator-owned video library: a personal collection of YouTube videos a
-- creator builds up independent of any one release (title + YouTube ID
-- only), which they can then attach to any of their releases. Replaces
-- item_video_embeds as the write path going forward; item_video_embeds and
-- item_submission_video_embeds are left in place, untouched and unused,
-- rather than dropped — see the backfill migration for the data move.
--
-- Scope decision: attaching a video to a release is treated as low-risk
-- metadata (closer to item_external_links than to price/licensing fields),
-- so unlike item_video_embeds this system does NOT participate in the
-- publishing-review snapshot/apply pipeline. A creator can add or remove
-- video attachments at any time, including mid-review.

create table public.creator_videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creator_videos_creator_idx on public.creator_videos(creator_id, created_at desc);

alter table public.creator_videos enable row level security;

create policy creator_videos_owner_all on public.creator_videos
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- A video is visible platform-wide the instant it's created, independent of
-- whether it's attached to any release — it shows up on the creator's
-- Public Profile and Home's cross-creator Videos tab regardless.
create policy creator_videos_public_read on public.creator_videos
  for select to anon
  using (true);

grant select, insert, update, delete on public.creator_videos to authenticated;
grant select on public.creator_videos to anon;
grant all on public.creator_videos to service_role;

create trigger creator_videos_touch_updated_at before update on public.creator_videos
for each row execute function public.touch_content_updated_at();

-- Release <-> library-video junction. A video's existence is independent of
-- any attachment; deleting the video cascades away its attachments, and
-- deleting the release cascades away its attachment rows without touching
-- the video itself.
create table public.item_video_attachments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 10),
  created_at timestamptz not null default now(),
  unique (item_id, video_id),
  unique (item_id, sort_order)
);
create index item_video_attachments_item_order_idx on public.item_video_attachments(item_id, sort_order);

alter table public.item_video_attachments enable row level security;

create policy item_video_attachments_public_or_manager_read on public.item_video_attachments
for select to anon,authenticated using (
  public.can_manage_item(item_id)
  or exists(select 1 from public.catalog_items item where item.id=item_video_attachments.item_id and item.status='published')
);

revoke all on public.item_video_attachments from anon,authenticated;
grant select on public.item_video_attachments to anon,authenticated;
grant all on public.item_video_attachments to service_role;

create or replace function public.save_creator_video(p_title text, p_url text)
returns table(id uuid, title text, youtube_video_id text)
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

  insert into public.creator_videos(creator_id, title, youtube_video_id)
  values (active_user, resolved_title, parsed_id)
  returning creator_videos.id into new_id;

  return query select new_id, resolved_title, parsed_id;
end;
$$;
grant execute on function public.save_creator_video(text,text) to authenticated;

create or replace function public.delete_creator_video(target_video_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.creator_videos
  where id = target_video_id and creator_id = auth.uid();
end;
$$;
grant execute on function public.delete_creator_video(uuid) to authenticated;

create or replace function public.replace_owned_item_video_attachments(
  target_item_id uuid,
  target_video_ids uuid[] default '{}'
) returns void language plpgsql security definer set search_path=public as $$
declare
  item_author uuid;
  video_id uuid;
  position integer := 0;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item management required.' using errcode='42501';
  end if;
  if array_length(target_video_ids,1) > 10 then
    raise exception 'Up to ten videos may be attached to a release.' using errcode='22023';
  end if;

  select author_id into item_author from public.catalog_items where id = target_item_id;

  foreach video_id in array coalesce(target_video_ids, '{}'::uuid[]) loop
    if not exists(select 1 from public.creator_videos v where v.id = video_id and v.creator_id = item_author) then
      raise exception 'Every attached video must belong to this release''s creator.' using errcode='42501';
    end if;
  end loop;

  delete from public.item_video_attachments where item_id = target_item_id;

  foreach video_id in array coalesce(target_video_ids, '{}'::uuid[]) loop
    insert into public.item_video_attachments(item_id, video_id, sort_order)
    values (target_item_id, video_id, position);
    position := position + 1;
  end loop;
end;
$$;
grant execute on function public.replace_owned_item_video_attachments(uuid,uuid[]) to authenticated;

-- Flat, newest-first, cross-creator video feed for Home's Videos tab.
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
    order by cv.created_at desc
    limit bounded_limit offset page_offset
  ) v;
  return result;
end;
$$;
grant execute on function public.browse_videos_v1(jsonb,integer) to anon,authenticated;
