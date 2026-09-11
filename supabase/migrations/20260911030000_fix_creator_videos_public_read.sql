-- creator_videos_public_read (20260911010000_creator_video_library.sql) was
-- scoped to `anon` only, so a signed-in viewer looking at someone else's
-- release had no policy granting them SELECT on that creator's videos —
-- the embedded item_video_attachments -> creator_videos join then failed
-- RLS for every authenticated viewer, breaking Item Detail for any release
-- with an attached video. Widen the read policy to match
-- item_video_attachments_public_or_manager_read's own `anon,authenticated`
-- scope.

drop policy if exists creator_videos_public_read on public.creator_videos;

create policy creator_videos_public_read on public.creator_videos
  for select to anon, authenticated
  using (true);
