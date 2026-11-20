alter table public.creator_videos
  add column if not exists youtube_metadata_checked_at timestamptz;

comment on column public.creator_videos.youtube_metadata_checked_at is
  'Timestamp of the one-time best-effort YouTube metadata lookup; prevents repeating lookups when YouTube returns no upload date.';
