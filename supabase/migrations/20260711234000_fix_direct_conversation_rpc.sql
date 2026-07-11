-- Avoid PL/pgSQL ambiguity between the local conversation id and table columns.
create or replace function public.create_or_open_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  direct_key text;
  resolved_conversation_id uuid;
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
  returning id into resolved_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (resolved_conversation_id, current_profile_id),
    (resolved_conversation_id, other_profile_id)
  on conflict on constraint conversation_members_pkey do nothing;

  return resolved_conversation_id;
end;
$$;

revoke all on function public.create_or_open_direct_conversation(uuid) from public;
grant execute on function public.create_or_open_direct_conversation(uuid) to authenticated;
