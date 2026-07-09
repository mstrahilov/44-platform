-- 44OS Community Questions + Collaboration foundation
-- Reviewed SQL only. Do not run until explicitly approved with backup/rollback.
-- Purpose: move Questions and Collaboration out of hashtag-only feed posts into
-- real structured community objects.

create extension if not exists pgcrypto;

create table if not exists public.community_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  vote_count integer not null default 0,
  answer_count integer not null default 0,
  accepted_answer_id uuid,
  has_accepted_answer boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.community_questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  vote_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.community_questions
  drop constraint if exists community_questions_accepted_answer_id_fkey;

alter table public.community_questions
  add constraint community_questions_accepted_answer_id_fkey
  foreign key (accepted_answer_id)
  references public.community_question_answers(id)
  on delete set null;

create table if not exists public.community_question_votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.community_questions(id) on delete cascade,
  answer_id uuid references public.community_question_answers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  value integer not null default 1 check (value in (1)),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (question_id is not null and answer_id is null)
    or (question_id is null and answer_id is not null)
  ),
  unique nulls not distinct (question_id, answer_id, profile_id)
);

create table if not exists public.community_collaborations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  role_needed text,
  project_type text,
  status text not null default 'open' check (status in ('open', 'filled', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_collaboration_responses (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.community_collaborations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (collaboration_id, author_id)
);

create or replace function public.set_community_object_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_community_questions_updated_at on public.community_questions;
create trigger set_community_questions_updated_at
before update on public.community_questions
for each row execute function public.set_community_object_updated_at();

drop trigger if exists set_community_question_answers_updated_at on public.community_question_answers;
create trigger set_community_question_answers_updated_at
before update on public.community_question_answers
for each row execute function public.set_community_object_updated_at();

drop trigger if exists set_community_collaborations_updated_at on public.community_collaborations;
create trigger set_community_collaborations_updated_at
before update on public.community_collaborations
for each row execute function public.set_community_object_updated_at();

drop trigger if exists set_community_collaboration_responses_updated_at on public.community_collaboration_responses;
create trigger set_community_collaboration_responses_updated_at
before update on public.community_collaboration_responses
for each row execute function public.set_community_object_updated_at();

create or replace function public.sync_question_counts()
returns trigger
language plpgsql
as $$
begin
  update public.community_questions
  set
    answer_count = (
      select count(*)
      from public.community_question_answers
      where question_id = coalesce(new.question_id, old.question_id)
    ),
    has_accepted_answer = exists (
      select 1
      from public.community_question_answers
      where question_id = coalesce(new.question_id, old.question_id)
        and is_accepted = true
    )
  where id = coalesce(new.question_id, old.question_id);
  return null;
end;
$$;

drop trigger if exists sync_question_counts_insert on public.community_question_answers;
create trigger sync_question_counts_insert
after insert or update or delete on public.community_question_answers
for each row execute function public.sync_question_counts();

create or replace function public.sync_question_vote_counts()
returns trigger
language plpgsql
as $$
begin
  if new.question_id is not null or old.question_id is not null then
    update public.community_questions
    set vote_count = (
      select count(*)
      from public.community_question_votes
      where question_id = coalesce(new.question_id, old.question_id)
    )
    where id = coalesce(new.question_id, old.question_id);
  end if;

  if new.answer_id is not null or old.answer_id is not null then
    update public.community_question_answers
    set vote_count = (
      select count(*)
      from public.community_question_votes
      where answer_id = coalesce(new.answer_id, old.answer_id)
    )
    where id = coalesce(new.answer_id, old.answer_id);
  end if;

  return null;
end;
$$;

drop trigger if exists sync_question_vote_counts_change on public.community_question_votes;
create trigger sync_question_vote_counts_change
after insert or update or delete on public.community_question_votes
for each row execute function public.sync_question_vote_counts();

create index if not exists community_questions_created_idx
  on public.community_questions (created_at desc);

create index if not exists community_questions_vote_idx
  on public.community_questions (vote_count desc, created_at desc);

create index if not exists community_questions_answer_idx
  on public.community_questions (answer_count desc, created_at desc);

create index if not exists community_question_answers_question_idx
  on public.community_question_answers (question_id, created_at desc);

create index if not exists community_collaborations_created_idx
  on public.community_collaborations (created_at desc);

create index if not exists community_collaborations_status_idx
  on public.community_collaborations (status, created_at desc);

create index if not exists community_collaboration_responses_collab_idx
  on public.community_collaboration_responses (collaboration_id, created_at desc);

alter table public.community_questions enable row level security;
alter table public.community_question_answers enable row level security;
alter table public.community_question_votes enable row level security;
alter table public.community_collaborations enable row level security;
alter table public.community_collaboration_responses enable row level security;

drop policy if exists "community questions public read" on public.community_questions;
create policy "community questions public read"
on public.community_questions
for select
using (true);

drop policy if exists "community question answers public read" on public.community_question_answers;
create policy "community question answers public read"
on public.community_question_answers
for select
using (true);

drop policy if exists "community question votes public read" on public.community_question_votes;
create policy "community question votes public read"
on public.community_question_votes
for select
using (true);

drop policy if exists "community collaborations public read" on public.community_collaborations;
create policy "community collaborations public read"
on public.community_collaborations
for select
using (true);

drop policy if exists "community collaboration responses public read" on public.community_collaboration_responses;
create policy "community collaboration responses public read"
on public.community_collaboration_responses
for select
using (true);

drop policy if exists "community questions auth insert" on public.community_questions;
create policy "community questions auth insert"
on public.community_questions
for insert
with check (auth.uid() = author_id);

drop policy if exists "community question answers auth insert" on public.community_question_answers;
create policy "community question answers auth insert"
on public.community_question_answers
for insert
with check (auth.uid() = author_id);

drop policy if exists "community question votes auth insert" on public.community_question_votes;
create policy "community question votes auth insert"
on public.community_question_votes
for insert
with check (auth.uid() = profile_id);

drop policy if exists "community collaborations auth insert" on public.community_collaborations;
create policy "community collaborations auth insert"
on public.community_collaborations
for insert
with check (auth.uid() = author_id);

drop policy if exists "community collaboration responses auth insert" on public.community_collaboration_responses;
create policy "community collaboration responses auth insert"
on public.community_collaboration_responses
for insert
with check (auth.uid() = author_id);

drop policy if exists "community questions owner update" on public.community_questions;
create policy "community questions owner update"
on public.community_questions
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "community question answers owner update" on public.community_question_answers;
create policy "community question answers owner update"
on public.community_question_answers
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "community collaborations owner update" on public.community_collaborations;
create policy "community collaborations owner update"
on public.community_collaborations
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "community collaboration responses owner update" on public.community_collaboration_responses;
create policy "community collaboration responses owner update"
on public.community_collaboration_responses
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

-- Intentional non-migration note:
-- existing hashtagged #question / #collaboration posts remain untouched.
-- Preserve or migrate them only after explicit product approval.
