-- 44 Platform: post_subjects foundation (tier-2 subject tagging)
--
-- Model layer clarification:
--   Tier 1: category  — post_type-level bucket (General / Update / Review / Question)
--   Tier 2: subject   — links a post to a specific product/service/resource/profile
--                       (this file adds `post_subjects` for this)
--   Tier 3: hashtag   — reserved for future use; the existing `post_tags` table
--                       (see supabase-clean-reset.sql) is preserved for hashtag semantics
--                       and NOT touched here.
--
-- Also seeds two new post-scope categories ('reviews' and 'questions') and
-- renames the display of 'discussions' to 'General'.
--
-- Run this in Supabase SQL editor. Idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- Ensure posts.slug exists (missing from the original schema).
-- Used for prettier thread URLs like /community/thread/here-comes-the-feeling-abc123.
-- Nullable so existing rows are unaffected. Not unique — buildSlug() in the app
-- appends a random 8-char suffix, so real collisions are effectively impossible.
-- ─────────────────────────────────────────────────────────────
alter table public.posts add column if not exists slug text;
create index if not exists posts_slug_idx on public.posts (slug);

-- ─────────────────────────────────────────────────────────────
-- post_subjects table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.post_subjects (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  subject_type text not null check (
    subject_type in ('product','service','resource','library_item','profile')
  ),
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  unique (post_id, subject_type, subject_id)
);

create index if not exists post_subjects_subject_idx on public.post_subjects (subject_type, subject_id);
create index if not exists post_subjects_post_idx on public.post_subjects (post_id);

alter table public.post_subjects enable row level security;

drop policy if exists "post_subjects_read"        on public.post_subjects;
drop policy if exists "post_subjects_insert_own"  on public.post_subjects;
drop policy if exists "post_subjects_delete_own"  on public.post_subjects;

create policy "post_subjects_read" on public.post_subjects
  for select using (true);

create policy "post_subjects_insert_own" on public.post_subjects
  for insert with check (
    auth.uid() = (select author_id from public.posts where id = post_id)
  );

create policy "post_subjects_delete_own" on public.post_subjects
  for delete using (
    auth.uid() = (select author_id from public.posts where id = post_id)
  );

-- ─────────────────────────────────────────────────────────────
-- Seed new post categories: reviews + questions
-- (matches the existing unique constraint: unique (scope, slug))
-- ─────────────────────────────────────────────────────────────
insert into public.categories (scope, slug, name, sort_order)
values
  ('posts', 'reviews',   'Reviews',   60),
  ('posts', 'questions', 'Questions', 70)
on conflict (scope, slug) do nothing;

-- Rename Discussions → General (slug stays 'discussions' to preserve FK integrity)
update public.categories
  set name = 'General'
  where scope = 'posts' and slug = 'discussions';

-- ─────────────────────────────────────────────────────────────
-- Force PostgREST to reload its schema cache
-- ─────────────────────────────────────────────────────────────
notify pgrst, 'reload schema';
