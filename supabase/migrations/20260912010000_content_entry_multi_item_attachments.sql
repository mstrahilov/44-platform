-- Community posts can now attach more than one release. `content_entries.item_id`
-- stays as the single "primary" attachment (unchanged — still required for
-- review/creator_update rows, still what content_review_author_item_key and
-- every existing single-item query key off). This table holds any additional
-- attachments beyond that one, so a post like "I posted two albums" can show
-- both as their own tappable cards without touching the legacy column.
create table public.content_entry_items (
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (content_entry_id, item_id)
);

create index content_entry_items_item_idx on public.content_entry_items(item_id);

alter table public.content_entry_items enable row level security;

-- Same visibility as the post itself: anyone can read the extra attachments
-- of a visible, published post; an author can always read their own.
create policy content_entry_items_public_read on public.content_entry_items
  for select
  using (
    exists (
      select 1 from public.content_entries e
      where e.id = content_entry_id
        and e.moderation_status = 'visible'
        and e.publication_status = 'published'
    )
    or exists (
      select 1 from public.content_entries e
      where e.id = content_entry_id
        and e.author_id = auth.uid()
    )
  );

grant select on public.content_entry_items to anon, authenticated;
