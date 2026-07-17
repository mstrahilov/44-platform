-- 44-owned Merch is the only supported physical catalog boundary for launch.
-- Service operations and platform administrators may manage Merch; creator
-- sessions may not create or convert Items into Merch even through direct API
-- or SECURITY DEFINER editor calls.

create or replace function public.enforce_platform_only_merch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.experience_type = 'merch'
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_platform_admin() then
    raise exception 'Merch publishing is currently limited to 44.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_platform_only_merch() from public;

drop trigger if exists catalog_items_platform_only_merch on public.catalog_items;
create trigger catalog_items_platform_only_merch
before insert or update of experience_type on public.catalog_items
for each row execute function public.enforce_platform_only_merch();
