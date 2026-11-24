-- Deleted accounts must be absent from every public/authenticated client query.
-- Keep the row only when protected transaction history requires it; RLS makes
-- the row behave as not-found to the app while service-role/admin workflows
-- can still perform controlled cleanup.

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public active profiles are readable"
  on public.profiles
  for select
  to anon, authenticated
  using (deletion_requested_at is null);

drop policy if exists "profile_external_links_read" on public.profile_external_links;
create policy "profile_external_links_read"
  on public.profile_external_links
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_external_links.profile_id
        and p.deletion_requested_at is null
        and (p.is_published or p.id = auth.uid())
    )
  );

-- A stale/deep link must not be enough to open a conversation with a deleted
-- account. This also protects callers that use the RPC rather than the UI.
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

  if not exists (
    select 1
    from public.profiles
    where id = other_profile_id
      and deletion_requested_at is null
  ) then
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

comment on policy "Public active profiles are readable" on public.profiles is
  'Deleted/anonymized profiles are intentionally invisible to anon and authenticated clients.';
