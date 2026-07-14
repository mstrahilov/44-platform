-- Temporary platform administration grant for the primary 44OS operator.
-- The account keeps creator access because is_approved_publisher treats admins
-- as approved publishers. This can be replaced with the future 44OS service
-- account when its managed email identity is available.

-- Role changes are normally approval-managed through set_profile_role(). A
-- migration is the approval path for this bootstrap grant, so bypass only the
-- row trigger for this one update and restore it before the migration ends.
drop trigger if exists protect_profile_role on public.profiles;

update public.profiles
set role = 'admin', updated_at = now()
where id = '1b902d98-d636-41e4-a7be-dae020240f4c'
  and role in ('member', 'creator');

create trigger protect_profile_role
before update of role on public.profiles
for each row execute function public.protect_profile_role();

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = '1b902d98-d636-41e4-a7be-dae020240f4c'
      and role = 'admin'
  ) then
    raise exception 'Expected ØLSTEN profile was not promoted to admin.';
  end if;
end;
$$;
