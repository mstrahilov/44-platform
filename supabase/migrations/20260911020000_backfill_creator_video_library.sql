-- One-time backfill: copy every existing item_video_embeds row into the new
-- creator_videos library (owned by that item's author) and attach it back
-- to its original release via item_video_attachments, preserving sort
-- order. No cross-release de-duplication — if the same YouTube ID appears
-- on two releases by the same creator today, it becomes two independent
-- library entries.
--
-- item_video_embeds and item_submission_video_embeds are left in place,
-- untouched and unused, after this runs. No drop, no rename.

do $$
declare
  r record;
  new_video_id uuid;
begin
  for r in
    select embed.item_id, embed.title, embed.youtube_video_id, embed.sort_order,
           embed.created_at, embed.updated_at, item.author_id
    from public.item_video_embeds embed
    join public.catalog_items item on item.id = embed.item_id
    where item.author_id is not null
    order by embed.created_at, embed.id
  loop
    insert into public.creator_videos (creator_id, title, youtube_video_id, created_at, updated_at)
    values (r.author_id, r.title, r.youtube_video_id, r.created_at, r.updated_at)
    returning id into new_video_id;

    insert into public.item_video_attachments (item_id, video_id, sort_order)
    values (r.item_id, new_video_id, r.sort_order);
  end loop;
end $$;
