-- Lets a member set custom artwork for their own playlist. Storage upload
-- itself needs no new policy: "Authenticated users can upload owned files"
-- (20260712053000_m10_curated_publishing_boundary.sql) already allows any
-- authenticated user to write to a `{folder}/{their-own-uid}/...` path in the
-- `uploads` bucket, and only gates the `products`/`tracks` roots behind
-- approved-publisher status — a new `playlists/` root needs no exception.

alter table public.playlists
  add column cover_url text;
