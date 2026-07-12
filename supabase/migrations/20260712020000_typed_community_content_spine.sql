-- M4: Typed Community Content Spine
--
-- Establishes one durable identity for Community content while keeping feature
-- payloads in constrained extension tables. Existing UUIDs, authorship, Item
-- associations, timestamps, replies, reactions, and moderation state are
-- preserved. Legacy tables remain temporarily as rollback/compatibility inputs.

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('discussion', 'question', 'collaboration', 'review', 'creator_update')),
  author_id uuid references public.profiles(id) on delete set null,
  item_id uuid references public.catalog_items(id) on delete cascade,
  title text,
  body text,
  slug text,
  publication_status text not null default 'published' check (publication_status in ('draft', 'published', 'archived')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_entries_scope_check check (
    (content_type in ('review', 'creator_update') and item_id is not null)
    or content_type in ('discussion', 'question', 'collaboration')
  ),
  constraint content_entries_body_check check (body is null or char_length(body) between 1 and 50000),
  constraint content_entries_title_check check (title is null or char_length(title) between 1 and 300)
);

create unique index content_entries_slug_key
  on public.content_entries(slug)
  where slug is not null;
create index content_entries_feed_idx
  on public.content_entries(content_type, publication_status, moderation_status, created_at desc);
create index content_entries_author_idx on public.content_entries(author_id, created_at desc);
create index content_entries_item_idx on public.content_entries(item_id, content_type, created_at desc)
  where item_id is not null;

comment on table public.content_entries is
  'Canonical identity and shared lifecycle for discussions, questions, collaborations, reviews, and creator updates. Feature payloads live in typed detail tables.';

create table public.content_question_details (
  entry_id uuid primary key references public.content_entries(id) on delete cascade,
  tags text[] not null default '{}',
  question_status text not null default 'open' check (question_status in ('open', 'closed', 'archived')),
  vote_count integer not null default 0 check (vote_count >= 0),
  answer_count integer not null default 0 check (answer_count >= 0),
  accepted_reply_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_collaboration_details (
  entry_id uuid primary key references public.content_entries(id) on delete cascade,
  role_needed text,
  project_type text,
  collaboration_status text not null default 'open' check (collaboration_status in ('open', 'filled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_review_details (
  entry_id uuid primary key references public.content_entries(id) on delete cascade,
  sentiment text not null default 'recommended' check (sentiment in ('recommended', 'not_recommended')),
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index content_review_author_item_key
  on public.content_entries(author_id, item_id)
  where content_type = 'review';

create table public.content_update_details (
  entry_id uuid primary key references public.content_entries(id) on delete cascade,
  version_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_replies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.content_entries(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  parent_reply_id uuid references public.content_replies(id) on delete cascade,
  reply_type text not null default 'comment' check (reply_type in ('comment', 'answer', 'collaboration_response')),
  body text not null check (char_length(body) between 1 and 20000),
  publication_status text not null default 'published' check (publication_status in ('published', 'archived')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'removed')),
  is_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_replies_entry_idx on public.content_replies(entry_id, created_at);
create index content_replies_parent_idx on public.content_replies(parent_reply_id)
  where parent_reply_id is not null;

alter table public.content_question_details
  add constraint content_question_details_accepted_reply_id_fkey
  foreign key (accepted_reply_id) references public.content_replies(id) on delete set null;

create table public.content_entry_reactions (
  entry_id uuid not null references public.content_entries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'upvote')),
  created_at timestamptz not null default now(),
  primary key (entry_id, profile_id, reaction_type)
);

create index content_entry_reactions_profile_idx on public.content_entry_reactions(profile_id, created_at desc);

create table public.content_reply_reactions (
  reply_id uuid not null references public.content_replies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'upvote')),
  created_at timestamptz not null default now(),
  primary key (reply_id, profile_id, reaction_type)
);

create index content_reply_reactions_profile_idx on public.content_reply_reactions(profile_id, created_at desc);

-- Preserve canonical UUIDs and content state.
insert into public.content_entries
  (id, content_type, author_id, title, body, slug, publication_status, moderation_status, created_at, updated_at)
select id, 'discussion', author_id, title, body, slug, status, 'visible', created_at, updated_at
from public.posts;

insert into public.content_entries
  (id, content_type, author_id, title, body, publication_status, moderation_status, created_at, updated_at)
select id, 'question', author_id, title, body,
       case when status = 'archived' then 'archived' else 'published' end,
       'visible', created_at, updated_at
from public.community_questions;

insert into public.content_question_details
  (entry_id, tags, question_status, vote_count, answer_count, created_at, updated_at)
select id, tags, status, vote_count, answer_count, created_at, updated_at
from public.community_questions;

insert into public.content_entries
  (id, content_type, author_id, title, body, publication_status, moderation_status, created_at, updated_at)
select id, 'collaboration', author_id, title, body,
       case when status = 'archived' then 'archived' else 'published' end,
       'visible', created_at, updated_at
from public.community_collaborations;

insert into public.content_collaboration_details
  (entry_id, role_needed, project_type, collaboration_status, created_at, updated_at)
select id, role_needed, project_type, status, created_at, updated_at
from public.community_collaborations;

insert into public.content_entries
  (id, content_type, author_id, item_id, title, body, publication_status, moderation_status, created_at, updated_at)
select id, 'review', user_id, item_id, title, body, 'published',
       case status when 'hidden' then 'hidden' when 'removed' then 'removed' else 'visible' end,
       created_at, updated_at
from public.product_reviews;

insert into public.content_review_details
  (entry_id, sentiment, rating, created_at, updated_at)
select id, sentiment, rating, created_at, updated_at
from public.product_reviews;

insert into public.content_entries
  (id, content_type, author_id, item_id, title, body, publication_status, moderation_status, created_at, updated_at)
select id, 'creator_update', author_id, item_id, title, body, status, 'visible', created_at, updated_at
from public.product_updates;

insert into public.content_update_details
  (entry_id, version_label, created_at, updated_at)
select id, version_label, created_at, updated_at
from public.product_updates;

insert into public.content_replies
  (id, entry_id, author_id, parent_reply_id, reply_type, body, publication_status, moderation_status, created_at, updated_at)
select id, post_id, author_id, parent_reply_id, 'comment', body, 'published',
       case status when 'hidden' then 'hidden' when 'removed' then 'removed' else 'visible' end,
       created_at, updated_at
from public.post_replies;

insert into public.content_replies
  (id, entry_id, author_id, reply_type, body, is_accepted, created_at, updated_at)
select id, question_id, author_id, 'answer', body, is_accepted, created_at, updated_at
from public.community_question_answers;

insert into public.content_replies
  (id, entry_id, author_id, reply_type, body, created_at, updated_at)
select id, collaboration_id, author_id, 'collaboration_response', body, created_at, updated_at
from public.community_collaboration_responses;

update public.content_question_details detail
set accepted_reply_id = question.accepted_answer_id
from public.community_questions question
where detail.entry_id = question.id;

insert into public.content_entry_reactions (entry_id, profile_id, reaction_type, created_at)
select post_id, profile_id, 'like', created_at from public.post_likes;

insert into public.content_reply_reactions (reply_id, profile_id, reaction_type, created_at)
select reply_id, profile_id, 'like', created_at from public.reply_likes;

insert into public.content_entry_reactions (entry_id, profile_id, reaction_type, created_at)
select question_id, profile_id, 'upvote', created_at
from public.community_question_votes where question_id is not null;

insert into public.content_reply_reactions (reply_id, profile_id, reaction_type, created_at)
select answer_id, profile_id, 'upvote', created_at
from public.community_question_votes where answer_id is not null;

create or replace function public.touch_content_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger content_entries_touch_updated_at before update on public.content_entries
for each row execute function public.touch_content_updated_at();
create trigger content_question_details_touch_updated_at before update on public.content_question_details
for each row execute function public.touch_content_updated_at();
create trigger content_collaboration_details_touch_updated_at before update on public.content_collaboration_details
for each row execute function public.touch_content_updated_at();
create trigger content_review_details_touch_updated_at before update on public.content_review_details
for each row execute function public.touch_content_updated_at();
create trigger content_update_details_touch_updated_at before update on public.content_update_details
for each row execute function public.touch_content_updated_at();
create trigger content_replies_touch_updated_at before update on public.content_replies
for each row execute function public.touch_content_updated_at();

create or replace function public.refresh_content_question_stats(target_entry_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.content_question_details
  set answer_count = (
        select count(*)::integer from public.content_replies
        where entry_id = target_entry_id and reply_type = 'answer'
          and publication_status = 'published' and moderation_status = 'visible'
      ),
      vote_count = (
        select count(*)::integer from public.content_entry_reactions
        where entry_id = target_entry_id and reaction_type = 'upvote'
      )
  where entry_id = target_entry_id;
$$;

create or replace function public.sync_content_question_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_entry uuid;
begin
  if tg_table_name = 'content_replies' then
    if tg_op = 'DELETE' then
      if old.reply_type <> 'answer' then return old; end if;
      target_entry := old.entry_id;
    else
      if new.reply_type <> 'answer' then return new; end if;
      target_entry := new.entry_id;
    end if;
  else
    if tg_op = 'DELETE' then
      if old.reaction_type <> 'upvote' then return old; end if;
      target_entry := old.entry_id;
    else
      if new.reaction_type <> 'upvote' then return new; end if;
      target_entry := new.entry_id;
    end if;
  end if;
  perform public.refresh_content_question_stats(target_entry);
  return coalesce(new, old);
end;
$$;

create trigger content_question_reply_stats
after insert or update or delete on public.content_replies
for each row execute function public.sync_content_question_stats();

create trigger content_question_vote_stats
after insert or delete on public.content_entry_reactions
for each row execute function public.sync_content_question_stats();

-- Read helpers used by RLS. Security definer avoids recursive policy checks.
create or replace function public.can_read_content(target_entry_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.content_entries entry
    where entry.id = target_entry_id
      and (
        (entry.publication_status = 'published' and entry.moderation_status = 'visible')
        or entry.author_id = auth.uid()
        or (entry.item_id is not null and public.can_manage_item(entry.item_id))
      )
  );
$$;

create or replace function public.can_manage_content(target_entry_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.content_entries entry
    where entry.id = target_entry_id
      and (entry.author_id = auth.uid() or (entry.item_id is not null and public.can_manage_item(entry.item_id)))
  );
$$;

alter table public.content_entries enable row level security;
alter table public.content_question_details enable row level security;
alter table public.content_collaboration_details enable row level security;
alter table public.content_review_details enable row level security;
alter table public.content_update_details enable row level security;
alter table public.content_replies enable row level security;
alter table public.content_entry_reactions enable row level security;
alter table public.content_reply_reactions enable row level security;

create policy content_entries_read on public.content_entries for select
using (
  (publication_status = 'published' and moderation_status = 'visible')
  or author_id = auth.uid()
  or (item_id is not null and public.can_manage_item(item_id))
);
create policy content_entries_insert on public.content_entries for insert to authenticated
with check (
  author_id = auth.uid()
  and moderation_status = 'visible'
  and (
    content_type in ('discussion', 'question', 'collaboration', 'review')
    or (content_type = 'creator_update' and item_id is not null and public.can_manage_item(item_id))
  )
);
create policy content_entries_update on public.content_entries for update to authenticated
using (public.can_manage_content(id))
with check (public.can_manage_content(id));
create policy content_entries_delete on public.content_entries for delete to authenticated
using (public.can_manage_content(id));

create policy content_question_details_read on public.content_question_details for select
using (public.can_read_content(entry_id));
create policy content_question_details_insert on public.content_question_details for insert to authenticated
with check (public.can_manage_content(entry_id));
create policy content_question_details_update on public.content_question_details for update to authenticated
using (public.can_manage_content(entry_id)) with check (public.can_manage_content(entry_id));
create policy content_question_details_delete on public.content_question_details for delete to authenticated
using (public.can_manage_content(entry_id));

create policy content_collaboration_details_read on public.content_collaboration_details for select
using (public.can_read_content(entry_id));
create policy content_collaboration_details_insert on public.content_collaboration_details for insert to authenticated
with check (public.can_manage_content(entry_id));
create policy content_collaboration_details_update on public.content_collaboration_details for update to authenticated
using (public.can_manage_content(entry_id)) with check (public.can_manage_content(entry_id));
create policy content_collaboration_details_delete on public.content_collaboration_details for delete to authenticated
using (public.can_manage_content(entry_id));

create policy content_review_details_read on public.content_review_details for select
using (public.can_read_content(entry_id));
create policy content_review_details_insert on public.content_review_details for insert to authenticated
with check (public.can_manage_content(entry_id));
create policy content_review_details_update on public.content_review_details for update to authenticated
using (public.can_manage_content(entry_id)) with check (public.can_manage_content(entry_id));
create policy content_review_details_delete on public.content_review_details for delete to authenticated
using (public.can_manage_content(entry_id));

create policy content_update_details_read on public.content_update_details for select
using (public.can_read_content(entry_id));
create policy content_update_details_insert on public.content_update_details for insert to authenticated
with check (public.can_manage_content(entry_id));
create policy content_update_details_update on public.content_update_details for update to authenticated
using (public.can_manage_content(entry_id)) with check (public.can_manage_content(entry_id));
create policy content_update_details_delete on public.content_update_details for delete to authenticated
using (public.can_manage_content(entry_id));

create policy content_replies_read on public.content_replies for select
using (public.can_read_content(entry_id) and (moderation_status = 'visible' or author_id = auth.uid()));
create policy content_replies_insert on public.content_replies for insert to authenticated
with check (author_id = auth.uid() and moderation_status = 'visible' and public.can_read_content(entry_id));
create policy content_replies_update on public.content_replies for update to authenticated
using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy content_replies_delete on public.content_replies for delete to authenticated
using (author_id = auth.uid());

create policy content_entry_reactions_read on public.content_entry_reactions for select
using (public.can_read_content(entry_id));
create policy content_entry_reactions_insert on public.content_entry_reactions for insert to authenticated
with check (profile_id = auth.uid() and public.can_read_content(entry_id));
create policy content_entry_reactions_delete on public.content_entry_reactions for delete to authenticated
using (profile_id = auth.uid());

create policy content_reply_reactions_read on public.content_reply_reactions for select
using (exists (select 1 from public.content_replies reply where reply.id = reply_id and public.can_read_content(reply.entry_id)));
create policy content_reply_reactions_insert on public.content_reply_reactions for insert to authenticated
with check (profile_id = auth.uid() and exists (select 1 from public.content_replies reply where reply.id = reply_id and public.can_read_content(reply.entry_id)));
create policy content_reply_reactions_delete on public.content_reply_reactions for delete to authenticated
using (profile_id = auth.uid());

-- Atomic typed creation/upsert operations keep the shared row and detail row
-- from diverging. Authorship always comes from auth.uid().
create or replace function public.create_content_question(
  question_title text, question_body text, question_tags text[] default '{}', target_item_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare entry_id uuid;
begin
  insert into public.content_entries (content_type, author_id, item_id, title, body)
  values ('question', auth.uid(), target_item_id, question_title, question_body)
  returning id into entry_id;
  insert into public.content_question_details (entry_id, tags) values (entry_id, coalesce(question_tags, '{}'));
  return entry_id;
end;
$$;

create or replace function public.create_content_discussion(
  discussion_title text, discussion_body text, discussion_slug text, target_item_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare entry_id uuid;
begin
  insert into public.content_entries (content_type, author_id, item_id, title, body, slug)
  values ('discussion', auth.uid(), target_item_id, discussion_title, discussion_body, discussion_slug)
  returning id into entry_id;
  return entry_id;
end;
$$;

create or replace function public.create_content_collaboration(
  collaboration_title text, collaboration_body text, needed_role text default null,
  collaboration_project_type text default null, target_item_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare entry_id uuid;
begin
  insert into public.content_entries (content_type, author_id, item_id, title, body)
  values ('collaboration', auth.uid(), target_item_id, collaboration_title, collaboration_body)
  returning id into entry_id;
  insert into public.content_collaboration_details (entry_id, role_needed, project_type)
  values (entry_id, needed_role, collaboration_project_type);
  return entry_id;
end;
$$;

create or replace function public.upsert_content_review(
  target_item_id uuid, review_body text, review_title text default null,
  review_sentiment text default 'recommended', review_rating integer default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_entry_id uuid;
begin
  select id into v_entry_id from public.content_entries
  where content_type = 'review' and author_id = auth.uid() and item_id = target_item_id;
  if v_entry_id is null then
    insert into public.content_entries (content_type, author_id, item_id, title, body)
    values ('review', auth.uid(), target_item_id, review_title, review_body)
    returning id into v_entry_id;
    insert into public.content_review_details (entry_id, sentiment, rating)
    values (v_entry_id, review_sentiment, review_rating);
  else
    update public.content_entries set title = review_title, body = review_body,
      publication_status = 'published', moderation_status = 'visible' where id = v_entry_id;
    update public.content_review_details set sentiment = review_sentiment, rating = review_rating
      where content_review_details.entry_id = v_entry_id;
  end if;
  return v_entry_id;
end;
$$;

create or replace function public.accept_content_answer(target_question_id uuid, target_reply_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_content(target_question_id) then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.content_replies where id = target_reply_id and entry_id = target_question_id and reply_type = 'answer') then
    raise exception 'answer does not belong to question';
  end if;
  update public.content_replies set is_accepted = (id = target_reply_id)
  where entry_id = target_question_id and reply_type = 'answer';
  update public.content_question_details set accepted_reply_id = target_reply_id where entry_id = target_question_id;
end;
$$;

grant select, insert, delete on public.content_entries to authenticated;
grant update (title, body, slug, publication_status) on public.content_entries to authenticated;
grant select on public.content_entries to anon;
grant select, delete on public.content_question_details to authenticated;
grant insert (entry_id, tags, question_status) on public.content_question_details to authenticated;
grant update (tags, question_status) on public.content_question_details to authenticated;
grant select on public.content_question_details to anon;
grant select, delete on public.content_collaboration_details to authenticated;
grant insert (entry_id, role_needed, project_type, collaboration_status) on public.content_collaboration_details to authenticated;
grant update (role_needed, project_type, collaboration_status) on public.content_collaboration_details to authenticated;
grant select on public.content_collaboration_details to anon;
grant select, delete on public.content_review_details to authenticated;
grant insert (entry_id, sentiment, rating) on public.content_review_details to authenticated;
grant update (sentiment, rating) on public.content_review_details to authenticated;
grant select on public.content_review_details to anon;
grant select, delete on public.content_update_details to authenticated;
grant insert (entry_id, version_label) on public.content_update_details to authenticated;
grant update (version_label) on public.content_update_details to authenticated;
grant select on public.content_update_details to anon;
grant select, delete on public.content_replies to authenticated;
grant insert (entry_id, author_id, parent_reply_id, reply_type, body) on public.content_replies to authenticated;
grant update (body, publication_status) on public.content_replies to authenticated;
grant select on public.content_replies to anon;
grant select, insert, delete on public.content_entry_reactions to authenticated;
grant select on public.content_entry_reactions to anon;
grant select, insert, delete on public.content_reply_reactions to authenticated;
grant select on public.content_reply_reactions to anon;
grant execute on function public.create_content_question(text, text, text[], uuid) to authenticated;
grant execute on function public.create_content_discussion(text, text, text, uuid) to authenticated;
grant execute on function public.create_content_collaboration(text, text, text, text, uuid) to authenticated;
grant execute on function public.upsert_content_review(uuid, text, text, text, integer) to authenticated;
grant execute on function public.accept_content_answer(uuid, uuid) to authenticated;
revoke execute on function public.create_content_question(text, text, text[], uuid) from public, anon;
revoke execute on function public.create_content_discussion(text, text, text, uuid) from public, anon;
revoke execute on function public.create_content_collaboration(text, text, text, text, uuid) from public, anon;
revoke execute on function public.upsert_content_review(uuid, text, text, text, integer) from public, anon;
revoke execute on function public.accept_content_answer(uuid, uuid) from public, anon;

-- Legacy-to-canonical mirrors cover the short deployment transition and make
-- rollback-safe writes from an older client visible on the new spine.
create or replace function public.mirror_legacy_post_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from public.content_entries where id = old.id; return old; end if;
  insert into public.content_entries (id, content_type, author_id, title, body, slug, publication_status, moderation_status, created_at, updated_at)
  values (new.id, 'discussion', new.author_id, new.title, new.body, new.slug, new.status, 'visible', new.created_at, new.updated_at)
  on conflict (id) do update set author_id=excluded.author_id,title=excluded.title,body=excluded.body,slug=excluded.slug,
    publication_status=excluded.publication_status,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_post after insert or update or delete on public.posts
for each row execute function public.mirror_legacy_post_to_content();

create or replace function public.mirror_legacy_post_reply_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from public.content_replies where id = old.id; return old; end if;
  insert into public.content_replies (id, entry_id, author_id, parent_reply_id, reply_type, body, publication_status, moderation_status, created_at, updated_at)
  values (new.id,new.post_id,new.author_id,new.parent_reply_id,'comment',new.body,'published',
    case new.status when 'hidden' then 'hidden' when 'removed' then 'removed' else 'visible' end,new.created_at,new.updated_at)
  on conflict (id) do update set author_id=excluded.author_id,parent_reply_id=excluded.parent_reply_id,body=excluded.body,
    moderation_status=excluded.moderation_status,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_post_reply after insert or update or delete on public.post_replies
for each row execute function public.mirror_legacy_post_reply_to_content();

create or replace function public.mirror_legacy_post_like_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from public.content_entry_reactions where entry_id=old.post_id and profile_id=old.profile_id and reaction_type='like'; return old; end if;
  insert into public.content_entry_reactions(entry_id,profile_id,reaction_type,created_at)
  values(new.post_id,new.profile_id,'like',new.created_at) on conflict do nothing; return new;
end;
$$;
create trigger mirror_legacy_post_like after insert or delete on public.post_likes
for each row execute function public.mirror_legacy_post_like_to_content();

create or replace function public.mirror_legacy_reply_like_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from public.content_reply_reactions where reply_id=old.reply_id and profile_id=old.profile_id and reaction_type='like'; return old; end if;
  insert into public.content_reply_reactions(reply_id,profile_id,reaction_type,created_at)
  values(new.reply_id,new.profile_id,'like',new.created_at) on conflict do nothing; return new;
end;
$$;
create trigger mirror_legacy_reply_like after insert or delete on public.reply_likes
for each row execute function public.mirror_legacy_reply_like_to_content();

create or replace function public.mirror_legacy_question_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from public.content_entries where id=old.id; return old; end if;
  insert into public.content_entries(id,content_type,author_id,title,body,publication_status,moderation_status,created_at,updated_at)
  values(new.id,'question',new.author_id,new.title,new.body,case when new.status='archived' then 'archived' else 'published' end,'visible',new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,title=excluded.title,body=excluded.body,
    publication_status=excluded.publication_status,updated_at=excluded.updated_at;
  insert into public.content_question_details(entry_id,tags,question_status,vote_count,answer_count,accepted_reply_id,created_at,updated_at)
  values(new.id,new.tags,new.status,new.vote_count,new.answer_count,new.accepted_answer_id,new.created_at,new.updated_at)
  on conflict(entry_id) do update set tags=excluded.tags,question_status=excluded.question_status,
    vote_count=excluded.vote_count,answer_count=excluded.answer_count,accepted_reply_id=excluded.accepted_reply_id,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_question after insert or update or delete on public.community_questions
for each row execute function public.mirror_legacy_question_to_content();

create or replace function public.mirror_legacy_question_answer_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then delete from public.content_replies where id=old.id; return old; end if;
  insert into public.content_replies(id,entry_id,author_id,reply_type,body,is_accepted,created_at,updated_at)
  values(new.id,new.question_id,new.author_id,'answer',new.body,new.is_accepted,new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,body=excluded.body,is_accepted=excluded.is_accepted,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_question_answer after insert or update or delete on public.community_question_answers
for each row execute function public.mirror_legacy_question_answer_to_content();

create or replace function public.mirror_legacy_question_vote_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then
    if old.question_id is not null then delete from public.content_entry_reactions where entry_id=old.question_id and profile_id=old.profile_id and reaction_type='upvote';
    else delete from public.content_reply_reactions where reply_id=old.answer_id and profile_id=old.profile_id and reaction_type='upvote'; end if;
    return old;
  end if;
  if new.question_id is not null then
    insert into public.content_entry_reactions(entry_id,profile_id,reaction_type,created_at)
    values(new.question_id,new.profile_id,'upvote',new.created_at) on conflict do nothing;
  else
    insert into public.content_reply_reactions(reply_id,profile_id,reaction_type,created_at)
    values(new.answer_id,new.profile_id,'upvote',new.created_at) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger mirror_legacy_question_vote after insert or delete on public.community_question_votes
for each row execute function public.mirror_legacy_question_vote_to_content();

create or replace function public.mirror_legacy_collaboration_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then delete from public.content_entries where id=old.id; return old; end if;
  insert into public.content_entries(id,content_type,author_id,title,body,publication_status,moderation_status,created_at,updated_at)
  values(new.id,'collaboration',new.author_id,new.title,new.body,case when new.status='archived' then 'archived' else 'published' end,'visible',new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,title=excluded.title,body=excluded.body,
    publication_status=excluded.publication_status,updated_at=excluded.updated_at;
  insert into public.content_collaboration_details(entry_id,role_needed,project_type,collaboration_status,created_at,updated_at)
  values(new.id,new.role_needed,new.project_type,new.status,new.created_at,new.updated_at)
  on conflict(entry_id) do update set role_needed=excluded.role_needed,project_type=excluded.project_type,
    collaboration_status=excluded.collaboration_status,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_collaboration after insert or update or delete on public.community_collaborations
for each row execute function public.mirror_legacy_collaboration_to_content();

create or replace function public.mirror_legacy_collaboration_response_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then delete from public.content_replies where id=old.id; return old; end if;
  insert into public.content_replies(id,entry_id,author_id,reply_type,body,created_at,updated_at)
  values(new.id,new.collaboration_id,new.author_id,'collaboration_response',new.body,new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,body=excluded.body,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_collaboration_response after insert or update or delete on public.community_collaboration_responses
for each row execute function public.mirror_legacy_collaboration_response_to_content();

create or replace function public.mirror_legacy_review_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then delete from public.content_entries where id=old.id; return old; end if;
  insert into public.content_entries(id,content_type,author_id,item_id,title,body,publication_status,moderation_status,created_at,updated_at)
  values(new.id,'review',new.user_id,new.item_id,new.title,new.body,'published',
    case new.status when 'hidden' then 'hidden' when 'removed' then 'removed' else 'visible' end,new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,item_id=excluded.item_id,title=excluded.title,body=excluded.body,
    moderation_status=excluded.moderation_status,updated_at=excluded.updated_at;
  insert into public.content_review_details(entry_id,sentiment,rating,created_at,updated_at)
  values(new.id,new.sentiment,new.rating,new.created_at,new.updated_at)
  on conflict(entry_id) do update set sentiment=excluded.sentiment,rating=excluded.rating,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_review after insert or update or delete on public.product_reviews
for each row execute function public.mirror_legacy_review_to_content();

create or replace function public.mirror_legacy_update_to_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' then delete from public.content_entries where id=old.id; return old; end if;
  insert into public.content_entries(id,content_type,author_id,item_id,title,body,publication_status,moderation_status,created_at,updated_at)
  values(new.id,'creator_update',new.author_id,new.item_id,new.title,new.body,new.status,'visible',new.created_at,new.updated_at)
  on conflict(id) do update set author_id=excluded.author_id,item_id=excluded.item_id,title=excluded.title,body=excluded.body,
    publication_status=excluded.publication_status,updated_at=excluded.updated_at;
  insert into public.content_update_details(entry_id,version_label,created_at,updated_at)
  values(new.id,new.version_label,new.created_at,new.updated_at)
  on conflict(entry_id) do update set version_label=excluded.version_label,updated_at=excluded.updated_at;
  return new;
end;
$$;
create trigger mirror_legacy_update after insert or update or delete on public.product_updates
for each row execute function public.mirror_legacy_update_to_content();

-- Canonical read contracts keep UI-specific shaping out of the storage model.
-- They deliberately retain the current app field vocabulary during M4 so the
-- visible Community can cut over without a redesign.
create view public.community_discussions with (security_invoker = true) as
select id, author_id, title, body, slug, publication_status as status, created_at, updated_at
from public.content_entries where content_type='discussion';

create view public.community_discussion_replies with (security_invoker = true) as
select id, entry_id as post_id, author_id, parent_reply_id, body,
  case when moderation_status='visible' then publication_status else moderation_status end as status,
  created_at, updated_at
from public.content_replies where reply_type='comment';

create view public.community_discussion_likes with (security_invoker = true) as
select entry_id as post_id, profile_id, created_at
from public.content_entry_reactions where reaction_type='like';

create view public.community_reply_likes with (security_invoker = true) as
select reply_id, profile_id, created_at
from public.content_reply_reactions where reaction_type='like';

create view public.community_question_content with (security_invoker = true) as
select entry.id, entry.author_id, entry.item_id, entry.title, entry.body, detail.tags,
  detail.vote_count, detail.answer_count, detail.accepted_reply_id as accepted_answer_id,
  (detail.accepted_reply_id is not null) as has_accepted_answer,
  detail.question_status as status, entry.created_at, entry.updated_at
from public.content_entries entry
join public.content_question_details detail on detail.entry_id=entry.id
where entry.content_type='question';

create view public.community_question_answer_content with (security_invoker = true) as
select reply.id, reply.entry_id as question_id, reply.author_id, reply.body,
  (select count(*)::integer from public.content_reply_reactions reaction
   where reaction.reply_id=reply.id and reaction.reaction_type='upvote') as vote_count,
  reply.is_accepted, reply.created_at, reply.updated_at
from public.content_replies reply where reply.reply_type='answer';

create view public.community_question_vote_content with (security_invoker = true) as
select (reaction.entry_id::text || ':' || reaction.profile_id::text || ':entry') as id,
  reaction.entry_id as question_id, null::uuid as answer_id, reaction.profile_id, 1 as value
from public.content_entry_reactions reaction where reaction.reaction_type='upvote'
union all
select (reaction.reply_id::text || ':' || reaction.profile_id::text || ':reply') as id,
  null::uuid as question_id, reaction.reply_id as answer_id, reaction.profile_id, 1 as value
from public.content_reply_reactions reaction where reaction.reaction_type='upvote';

create view public.community_collaboration_content with (security_invoker = true) as
select entry.id, entry.author_id, entry.item_id, entry.title, entry.body,
  detail.role_needed, detail.project_type, detail.collaboration_status as status,
  entry.created_at, entry.updated_at
from public.content_entries entry
join public.content_collaboration_details detail on detail.entry_id=entry.id
where entry.content_type='collaboration';

create view public.community_collaboration_response_content with (security_invoker = true) as
select id, entry_id as collaboration_id, author_id, body, created_at, updated_at
from public.content_replies where reply_type='collaboration_response';

create view public.community_review_content with (security_invoker = true) as
select entry.id, entry.author_id as user_id, entry.item_id, entry.title, entry.body,
  detail.sentiment, detail.rating,
  case when entry.moderation_status='visible' then entry.publication_status else entry.moderation_status end as status,
  entry.created_at, entry.updated_at
from public.content_entries entry
join public.content_review_details detail on detail.entry_id=entry.id
where entry.content_type='review';

create view public.community_update_content with (security_invoker = true) as
select entry.id, entry.item_id, entry.author_id, entry.title, entry.body,
  detail.version_label, entry.publication_status as status, entry.created_at, entry.updated_at
from public.content_entries entry
join public.content_update_details detail on detail.entry_id=entry.id
where entry.content_type='creator_update';

grant select on public.community_discussions, public.community_discussion_replies,
  public.community_discussion_likes, public.community_reply_likes,
  public.community_question_content, public.community_question_answer_content,
  public.community_question_vote_content, public.community_collaboration_content,
  public.community_collaboration_response_content, public.community_review_content,
  public.community_update_content to anon, authenticated;
