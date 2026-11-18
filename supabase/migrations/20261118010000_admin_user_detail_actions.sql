-- Audited administrator promotion and account bans from the Admin user page.

create or replace function public.set_admin_platform_access(target_profile_id uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_role text;
  account_email text;
  normalized_reason text := coalesce(nullif(btrim(target_reason), ''), 'Not applicable');
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if target_profile_id = auth.uid() then
    raise exception 'You cannot promote your own account.' using errcode = '42501';
  end if;
  if char_length(normalized_reason) > 500 then
    raise exception 'The audit note is too long.' using errcode = '22023';
  end if;

  select email::text into account_email from auth.users where id = target_profile_id;
  if not found then raise exception 'Account not found.' using errcode = 'P0002'; end if;

  insert into public.profiles(id, display_name, username, slug, role)
  values (
    target_profile_id,
    coalesce(nullif(split_part(account_email, '@', 1), ''), '44 Member'),
    'member_' || left(replace(target_profile_id::text, '-', ''), 8),
    'member-' || left(replace(target_profile_id::text, '-', ''), 8),
    'member'
  ) on conflict(id) do nothing;

  select role into existing_role from public.profiles where id = target_profile_id for update;
  if existing_role = 'admin' then raise exception 'This account is already an administrator.' using errcode = '55000'; end if;

  update public.profiles set role = 'admin', updated_at = now() where id = target_profile_id;
  insert into public.admin_profile_role_events(profile_id, previous_role, new_role, changed_by, reason)
  values (target_profile_id, existing_role, 'admin', auth.uid(), normalized_reason);
end;
$$;

revoke all on function public.set_admin_platform_access(uuid, text) from public, anon;
grant execute on function public.set_admin_platform_access(uuid, text) to authenticated, service_role;

create table public.admin_account_ban_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete restrict,
  changed_by uuid not null references auth.users(id) on delete restrict,
  banned_until timestamptz not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);
create index admin_account_ban_events_profile_idx on public.admin_account_ban_events(profile_id, created_at desc);
create trigger admin_account_ban_events_immutable before update or delete on public.admin_account_ban_events
  for each row execute function public.reject_admin_audit_mutation();
alter table public.admin_account_ban_events enable row level security;
create policy admin_account_ban_events_admin_read on public.admin_account_ban_events
  for select to authenticated using (public.is_platform_admin());
revoke all on public.admin_account_ban_events from public, anon, authenticated;
grant select on public.admin_account_ban_events to authenticated;
grant all on public.admin_account_ban_events to service_role;

comment on table public.admin_account_ban_events is 'Immutable audit trail for Admin-initiated account bans.';
