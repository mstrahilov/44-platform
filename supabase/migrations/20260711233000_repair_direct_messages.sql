-- Create/open direct conversations atomically so RLS cannot hide a newly
-- inserted conversation before its memberships have been created.
create or replace function public.create_or_open_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  direct_key text;
  conversation_id uuid;
begin
  if current_profile_id is null then
    raise exception 'You must be signed in to start a conversation.' using errcode = '42501';
  end if;

  if other_profile_id is null or other_profile_id = current_profile_id then
    raise exception 'Choose another member to message.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = other_profile_id) then
    raise exception 'That member profile is unavailable.' using errcode = 'P0002';
  end if;

  direct_key := least(current_profile_id::text, other_profile_id::text)
    || ':' || greatest(current_profile_id::text, other_profile_id::text);

  insert into public.conversations (conversation_key, created_by)
  values (direct_key, current_profile_id)
  on conflict (conversation_key) do update
    set conversation_key = excluded.conversation_key
  returning id into conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (conversation_id, current_profile_id),
    (conversation_id, other_profile_id)
  on conflict (conversation_id, profile_id) do nothing;

  return conversation_id;
end;
$$;

revoke all on function public.create_or_open_direct_conversation(uuid) from public;
grant execute on function public.create_or_open_direct_conversation(uuid) to authenticated;

-- Insert the message and bump the conversation timestamp in one transaction.
create or replace function public.send_direct_message(
  target_conversation_id uuid,
  message_body text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  clean_body text := trim(coalesce(message_body, ''));
  created_message public.messages;
begin
  if current_profile_id is null then
    raise exception 'You must be signed in to send a message.' using errcode = '42501';
  end if;

  if clean_body = '' then
    raise exception 'Write a message before sending.' using errcode = '22023';
  end if;

  if char_length(clean_body) > 4000 then
    raise exception 'Messages can be up to 4,000 characters.' using errcode = '22001';
  end if;

  if not public.is_conversation_member(target_conversation_id, current_profile_id) then
    raise exception 'You do not have access to this conversation.' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body, status)
  values (target_conversation_id, current_profile_id, clean_body, 'sent')
  returning * into created_message;

  update public.conversations
  set updated_at = created_message.created_at
  where id = target_conversation_id;

  return created_message;
end;
$$;

revoke all on function public.send_direct_message(uuid, text) from public;
grant execute on function public.send_direct_message(uuid, text) to authenticated;
