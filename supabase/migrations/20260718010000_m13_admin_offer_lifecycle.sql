-- P6 rollback rehearsal support: audited pause/restore for paid digital offers.
-- Item publication, buyer access, money records, and provider evidence are not mutated.

create table public.admin_offer_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  action text not null check (action in ('pause','restore')),
  previous_status text not null check (previous_status in ('draft','active')),
  new_status text not null check (new_status in ('draft','active')),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check (previous_status <> new_status),
  check (
    (action='pause' and previous_status='active' and new_status='draft')
    or (action='restore' and previous_status='draft' and new_status='active')
  )
);

create index admin_offer_lifecycle_events_offer_idx
  on public.admin_offer_lifecycle_events(offer_id,created_at desc,id desc);
create index admin_offer_lifecycle_events_item_idx
  on public.admin_offer_lifecycle_events(item_id,created_at desc,id desc);

create trigger admin_offer_lifecycle_events_immutable
before update or delete on public.admin_offer_lifecycle_events
for each row execute function public.reject_admin_audit_mutation();

alter table public.admin_offer_lifecycle_events enable row level security;
create policy admin_offer_lifecycle_events_admin_read
on public.admin_offer_lifecycle_events for select to authenticated
using(public.is_platform_admin());

revoke all on public.admin_offer_lifecycle_events from public,anon,authenticated;
grant select on public.admin_offer_lifecycle_events to authenticated;
grant all on public.admin_offer_lifecycle_events to service_role;

create or replace function public.set_admin_offer_lifecycle(
  target_offer_id uuid,
  target_action text,
  target_reason text
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  offer_row public.catalog_offers;
  item_row public.catalog_items;
  normalized_reason text := btrim(target_reason);
  next_status text;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if target_action not in ('pause','restore') then
    raise exception 'Invalid offer lifecycle action.' using errcode='22023';
  end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;

  select * into offer_row from public.catalog_offers where id=target_offer_id for update;
  if not found then raise exception 'Offer not found.' using errcode='P0002'; end if;
  if offer_row.offer_type<>'digital_download' or offer_row.fulfillment_type<>'entitlement' or offer_row.price_cents<=0 then
    raise exception 'Only paid digital download offers can use this control.' using errcode='55000';
  end if;
  if offer_row.status='archived' then
    raise exception 'Archived offers are final and cannot be restored.' using errcode='55000';
  end if;

  select * into item_row from public.catalog_items where id=offer_row.item_id for share;
  if not found then raise exception 'Item not found.' using errcode='P0002'; end if;

  if target_action='pause' then
    if offer_row.status<>'active' then
      raise exception 'Only active paid offers can be paused.' using errcode='55000';
    end if;
    next_status := 'draft';
  else
    if offer_row.status<>'draft' then
      raise exception 'Only paused paid offers can be restored.' using errcode='55000';
    end if;
    if item_row.status<>'published' then
      raise exception 'The parent Item must be published before its paid offer can be restored.' using errcode='55000';
    end if;
    if item_row.author_id is null or not public.is_creator_paid_sales_enabled(item_row.author_id) then
      raise exception 'The seller is not currently eligible for paid sales.' using errcode='55000';
    end if;
    next_status := 'active';
  end if;

  update public.catalog_offers set status=next_status,updated_at=now() where id=offer_row.id;
  insert into public.admin_offer_lifecycle_events(
    offer_id,item_id,action,previous_status,new_status,changed_by,reason
  ) values(
    offer_row.id,offer_row.item_id,target_action,offer_row.status,next_status,auth.uid(),normalized_reason
  );
  return next_status;
end;
$$;

revoke all on function public.set_admin_offer_lifecycle(uuid,text,text) from public,anon,authenticated;
grant execute on function public.set_admin_offer_lifecycle(uuid,text,text) to authenticated,service_role;

comment on table public.admin_offer_lifecycle_events is
  'Immutable administrator audit for reversible paid digital offer pauses and restores.';
comment on function public.set_admin_offer_lifecycle(uuid,text,text) is
  'Admin-only paid digital offer pause/restore that preserves Item identity and all historical commerce, access, earnings, and provider evidence.';
