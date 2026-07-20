-- Admin-only, audited corrections for historical Music release dates.
-- Existing creator edits remain compatible; new publication health still owns
-- the requirement for future Music releases.

create table public.admin_item_release_date_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  previous_release_date date,
  new_release_date date not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

create index admin_item_release_date_events_item_idx
  on public.admin_item_release_date_events(item_id,created_at desc,id desc);

create trigger admin_item_release_date_events_immutable
before update or delete on public.admin_item_release_date_events
for each row execute function public.reject_admin_audit_mutation();

alter table public.admin_item_release_date_events enable row level security;
create policy admin_item_release_date_events_admin_read
on public.admin_item_release_date_events for select to authenticated
using(public.is_platform_admin());

revoke all on public.admin_item_release_date_events from public,anon,authenticated;
grant select on public.admin_item_release_date_events to authenticated;
grant all on public.admin_item_release_date_events to service_role;

create or replace function public.get_admin_item_release_date(target_item_id uuid)
returns date language plpgsql security definer stable set search_path=public as $$
declare result date;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  select release_date into result from public.catalog_items where id=target_item_id;
  if not found then raise exception 'Content not found.' using errcode='P0002'; end if;
  return result;
end;
$$;

create or replace function public.set_admin_item_release_date(
  target_item_id uuid,
  target_release_date date,
  target_reason text
) returns date language plpgsql security definer set search_path=public as $$
declare item_row public.catalog_items;
declare normalized_reason text:=btrim(target_reason);
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if target_release_date is null or target_release_date < date '1000-01-01'
    or target_release_date > (current_date + interval '1 year')::date then
    raise exception 'Release Date is invalid.' using errcode='22023';
  end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;

  select * into item_row from public.catalog_items where id=target_item_id for update;
  if not found then raise exception 'Content not found.' using errcode='P0002'; end if;
  if item_row.experience_type<>'music' then
    raise exception 'Release Date corrections are limited to Music.' using errcode='22023';
  end if;
  if item_row.release_date=target_release_date then
    raise exception 'Release Date is already set to that value.' using errcode='55000';
  end if;

  update public.catalog_items
  set release_date=target_release_date,
      year=extract(year from target_release_date)::integer,
      updated_at=now()
  where id=target_item_id;

  insert into public.admin_item_release_date_events(
    item_id,previous_release_date,new_release_date,changed_by,reason
  ) values(
    target_item_id,item_row.release_date,target_release_date,auth.uid(),normalized_reason
  );
  return target_release_date;
end;
$$;

revoke all on function public.get_admin_item_release_date(uuid),
  public.set_admin_item_release_date(uuid,date,text) from public,anon,authenticated;
grant execute on function public.get_admin_item_release_date(uuid),
  public.set_admin_item_release_date(uuid,date,text) to authenticated,service_role;

comment on table public.admin_item_release_date_events is
  'Immutable audit history for administrator corrections to historical Music release dates.';
comment on function public.set_admin_item_release_date(uuid,date,text) is
  'Admin-only atomic Music release-date correction; synchronizes year and records immutable before/after history.';
