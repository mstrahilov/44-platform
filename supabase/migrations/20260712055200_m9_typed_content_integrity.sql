-- M9 enforces typed detail/reply integrity even when callers bypass application RPCs.

alter table public.content_entries
  add constraint content_entries_title_length check (title is null or char_length(btrim(title)) between 1 and 160) not valid,
  add constraint content_entries_body_length check (char_length(btrim(body)) between 1 and 10000) not valid;
alter table public.content_entries validate constraint content_entries_title_length;
alter table public.content_entries validate constraint content_entries_body_length;

alter table public.content_replies
  add constraint content_replies_body_length check (char_length(btrim(body)) between 1 and 5000) not valid;
alter table public.content_replies validate constraint content_replies_body_length;

create or replace function public.enforce_content_entry_detail()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.content_type = 'question' and not exists(select 1 from public.content_question_details where entry_id = new.id) then
    raise exception 'Question detail row is required.' using errcode = '23514';
  elsif new.content_type = 'collaboration' and not exists(select 1 from public.content_collaboration_details where entry_id = new.id) then
    raise exception 'Collaboration detail row is required.' using errcode = '23514';
  elsif new.content_type = 'review' and not exists(select 1 from public.content_review_details where entry_id = new.id) then
    raise exception 'Review detail row is required.' using errcode = '23514';
  elsif new.content_type = 'creator_update' and not exists(select 1 from public.content_update_details where entry_id = new.id) then
    raise exception 'Creator Update detail row is required.' using errcode = '23514';
  end if;
  if new.item_id is not null and new.content_type <> 'creator_update'
    and not exists(select 1 from public.catalog_items where id = new.item_id and status = 'published') then
    raise exception 'Item-scoped content requires a published Item.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_content_entry_detail on public.content_entries;
create constraint trigger enforce_content_entry_detail
after insert or update of content_type, item_id on public.content_entries
deferrable initially deferred for each row execute function public.enforce_content_entry_detail();

create or replace function public.enforce_content_reply_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare parent_type text;
begin
  select content_type into parent_type from public.content_entries where id = new.entry_id;
  if (new.reply_type = 'answer' and parent_type <> 'question')
    or (new.reply_type = 'collaboration_response' and parent_type <> 'collaboration')
    or (new.reply_type = 'reply' and parent_type in ('question', 'collaboration')) then
    raise exception 'Reply type does not match its content entry.' using errcode = '23514';
  end if;
  if new.parent_reply_id is not null and not exists(
    select 1 from public.content_replies parent
    where parent.id = new.parent_reply_id and parent.entry_id = new.entry_id
  ) then
    raise exception 'Parent reply must belong to the same content entry.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_content_reply_type on public.content_replies;
create trigger enforce_content_reply_type before insert or update of entry_id, parent_reply_id, reply_type
on public.content_replies for each row execute function public.enforce_content_reply_type();

revoke execute on function public.enforce_content_entry_detail() from public, anon, authenticated;
revoke execute on function public.enforce_content_reply_type() from public, anon, authenticated;
