-- Lets a Community post carry one attached photo and/or one attached
-- streamable link (YouTube/SoundCloud for now), alongside its body text.
-- No RLS change needed: `content_entries_update` already scopes to
-- `can_manage_content(id)` (the author), which already covers any column
-- on the row, including these two new ones — the same path `updatePost`
-- already uses today for editing `title`/`body` directly from the client.

alter table public.content_entries
  add column image_url text,
  add column link_url text;

alter table public.content_entries
  add constraint content_entries_image_url_check
    check (image_url is null or image_url ~ '^https://[^[:space:]]+$'),
  add constraint content_entries_link_url_check
    check (
      link_url is null
      or link_url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|soundcloud\.com)/[^[:space:]]*$'
    );
