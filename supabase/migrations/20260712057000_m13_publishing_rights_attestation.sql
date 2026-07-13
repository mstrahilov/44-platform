-- M13: durable, server-authoritative publishing-rights attestation.
-- Existing Items remain published and untouched. A new attestation is required
-- only on the next creator-requested publication transition.

create table public.item_rights_attestations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  attested_by uuid not null references public.profiles(id) on delete restrict,
  policy_version text not null,
  statement text not null,
  attested_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create index item_rights_attestations_item_idx
  on public.item_rights_attestations(item_id, attested_at desc);

create or replace function public.reject_rights_attestation_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Publishing-rights attestations are immutable.';
end;
$$;

create trigger item_rights_attestations_immutable
before update or delete on public.item_rights_attestations
for each row execute function public.reject_rights_attestation_mutation();

alter table public.item_rights_attestations enable row level security;

create policy item_rights_attestations_owner_read on public.item_rights_attestations
for select to authenticated using (public.can_manage_item(item_id));

revoke all on public.item_rights_attestations from anon, authenticated;
grant select on public.item_rights_attestations to authenticated;
grant all on public.item_rights_attestations to service_role;

create or replace function public.attest_owned_item_rights(
  target_item_id uuid,
  accepted boolean,
  target_policy_version text default '2026-07-12-v1'
) returns uuid
language plpgsql security definer set search_path=public as $$
declare attestation_id uuid;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or publishing is not approved for this account.' using errcode='42501';
  end if;
  if accepted is not true then
    raise exception 'Publishing-rights confirmation is required.' using errcode='23514';
  end if;
  if target_policy_version <> '2026-07-12-v1' then
    raise exception 'The publishing-rights statement has changed. Review the current statement.' using errcode='22023';
  end if;
  insert into public.item_rights_attestations(item_id,attested_by,policy_version,statement)
  values(target_item_id,auth.uid(),target_policy_version,
    'I confirm that I own this work or have the necessary rights and permission to publish and distribute it through 44OS.')
  returning id into attestation_id;
  return attestation_id;
end;
$$;

revoke all on function public.attest_owned_item_rights(uuid,boolean,text) from public;
grant execute on function public.attest_owned_item_rights(uuid,boolean,text) to authenticated,service_role;

create or replace function public.set_owned_item_publication_status(target_item_id uuid, target_status text)
returns void language plpgsql security definer set search_path=public as $$
declare problem record;
begin
  if target_status not in ('draft','published') then
    raise exception 'Invalid publication status.' using errcode='22023';
  end if;
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or publishing is not approved for this account.' using errcode='42501';
  end if;
  if exists(select 1 from public.catalog_items where id=target_item_id and status='archived') then
    raise exception 'Archived Items cannot be republished.' using errcode='55000';
  end if;
  if target_status='published' then
    if not exists (
      select 1 from public.item_rights_attestations
      where item_id=target_item_id and policy_version='2026-07-12-v1' and revoked_at is null
    ) then
      raise exception 'Publication blocked: confirm that you own the work or have permission to publish it.' using errcode='23514';
    end if;
    select * into problem from public.catalog_item_health(target_item_id) limit 1;
    if found then raise exception 'Publication blocked: %',problem.message using errcode='23514'; end if;
  end if;
  update public.catalog_items set status=target_status,updated_at=now() where id=target_item_id;
end;
$$;

comment on table public.item_rights_attestations is
  'Immutable creator acknowledgement; it records a claim and does not represent independent verification by 44.';
