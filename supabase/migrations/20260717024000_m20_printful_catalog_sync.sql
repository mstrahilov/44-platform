begin;

-- A complete provider snapshot is the only authority permitted to archive
-- existing catalog rows. Runs are service-only and serialize reconciliation.
alter table public.printful_product_mappings
  drop constraint if exists printful_product_mappings_status_check,
  add constraint printful_product_mappings_status_check
    check (status in ('draft','reviewed','blocked','archived')),
  add column if not exists last_catalog_sync_id uuid;

alter table public.printful_variant_mappings
  drop constraint if exists printful_variant_mappings_status_check,
  add constraint printful_variant_mappings_status_check
    check (status in ('draft','reviewed','blocked','archived')),
  add column if not exists last_catalog_sync_id uuid;

create table public.printful_catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  store_id bigint not null,
  status text not null default 'running'
    check (status in ('running','completed','failed')),
  started_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  provider_product_count integer,
  summary jsonb not null default '{}' check (jsonb_typeof(summary)='object'),
  error_message text,
  check (
    (status='running' and completed_at is null)
    or (status in ('completed','failed') and completed_at is not null)
  )
);

create unique index printful_catalog_sync_one_running_store_idx
  on public.printful_catalog_sync_runs(store_id) where status='running';
create index printful_catalog_sync_runs_store_started_idx
  on public.printful_catalog_sync_runs(store_id,started_at desc);

alter table public.printful_product_mappings
  add constraint printful_product_mappings_sync_run_fkey
  foreign key (last_catalog_sync_id) references public.printful_catalog_sync_runs(id) on delete set null;
alter table public.printful_variant_mappings
  add constraint printful_variant_mappings_sync_run_fkey
  foreign key (last_catalog_sync_id) references public.printful_catalog_sync_runs(id) on delete set null;

create or replace function public.begin_printful_catalog_sync(
  target_store_id bigint,target_started_by uuid
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare run_id uuid;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_store_id<=0 or target_started_by is null then
    raise exception 'Printful sync request is invalid.' using errcode='22023';
  end if;

  -- A crashed worker must not block a later operator forever. It may never
  -- archive because only a completed run reaches the archive step.
  update public.printful_catalog_sync_runs
  set status='failed',completed_at=now(),error_message='Sync lease expired before completion.'
  where store_id=target_store_id and status='running'
    and started_at < now()-interval '30 minutes';

  insert into public.printful_catalog_sync_runs(store_id,started_by)
  values(target_store_id,target_started_by)
  returning id into run_id;
  return run_id;
exception when unique_violation then
  raise exception 'A complete Printful catalog sync is already running.' using errcode='55P03';
end;
$$;

create or replace function public.finish_printful_catalog_sync(
  target_run_id uuid,target_status text,target_product_count integer,
  target_summary jsonb,target_error_message text default null
) returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_status not in ('completed','failed') or target_product_count<0
    or jsonb_typeof(coalesce(target_summary,'{}'::jsonb))<>'object' then
    raise exception 'Printful sync completion is invalid.' using errcode='22023';
  end if;
  update public.printful_catalog_sync_runs
  set status=target_status,completed_at=now(),provider_product_count=target_product_count,
    summary=coalesce(target_summary,'{}'::jsonb),error_message=left(nullif(target_error_message,''),500)
  where id=target_run_id and status='running';
  if not found then raise exception 'Printful sync run is not active.' using errcode='55000'; end if;
end;
$$;

alter table public.printful_catalog_sync_runs enable row level security;
revoke all on public.printful_catalog_sync_runs from public,anon,authenticated;
grant all on public.printful_catalog_sync_runs to service_role;
revoke all on function public.begin_printful_catalog_sync(bigint,uuid) from public,anon,authenticated;
revoke all on function public.finish_printful_catalog_sync(uuid,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.begin_printful_catalog_sync(bigint,uuid) to service_role;
grant execute on function public.finish_printful_catalog_sync(uuid,text,integer,jsonb,text) to service_role;

comment on table public.printful_catalog_sync_runs is
  'Service-only complete Printful catalog snapshot leases. Failed or partial runs never archive product or variant history.';

commit;
