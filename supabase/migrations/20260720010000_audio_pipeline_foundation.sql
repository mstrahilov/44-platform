begin;

-- M22: private source audio, verified public streaming derivatives, durable
-- processing jobs, and delayed cleanup. The migration is intentionally
-- additive: it does not move or delete any existing object.

update storage.buckets
set file_size_limit = 52428800
where id = 'uploads';

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('audio-sources','audio-sources',false,524288000,array[
    'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac',
    'audio/wav','audio/x-wav','audio/flac','audio/x-flac','audio/aiff','audio/x-aiff',
    'audio/alac','audio/x-aac','application/octet-stream'
  ]::text[]),
  ('audio-streams','audio-streams',true,262144000,array['audio/mpeg','audio/mp3']::text[]),
  ('audio-quarantine','audio-quarantine',false,524288000,array[
    'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac',
    'audio/wav','audio/x-wav','audio/flac','audio/x-flac','audio/aiff','audio/x-aiff',
    'audio/alac','audio/x-aac','application/octet-stream'
  ]::text[])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  track_id uuid unique references public.tracks(id) on delete set null,
  status text not null default 'pending_upload' check(status in('pending_upload','uploaded','processing','ready','failed')),
  source_bucket text not null default 'audio-sources' check(source_bucket in('audio-sources','uploads','audio-quarantine')),
  source_path text not null unique check(char_length(source_path) between 3 and 900),
  original_filename text not null check(char_length(original_filename) between 1 and 255),
  source_content_type text not null check(char_length(source_content_type) between 3 and 120),
  source_byte_size bigint not null check(source_byte_size > 0 and source_byte_size <= 524288000),
  source_sha256 text check(source_sha256 is null or source_sha256 ~ '^[a-f0-9]{64}$'),
  source_codec text,
  source_duration_seconds numeric(12,3) check(source_duration_seconds is null or source_duration_seconds > 0),
  stream_bucket text check(stream_bucket is null or stream_bucket in('audio-streams','uploads')),
  stream_path text unique,
  stream_public_url text,
  stream_content_type text,
  stream_byte_size bigint check(stream_byte_size is null or stream_byte_size > 0),
  stream_sha256 text check(stream_sha256 is null or stream_sha256 ~ '^[a-f0-9]{64}$'),
  stream_bitrate_kbps integer check(stream_bitrate_kbps is null or stream_bitrate_kbps between 8 and 10000),
  stream_duration_seconds numeric(12,3) check(stream_duration_seconds is null or stream_duration_seconds > 0),
  retention_mode text not null default 'pending' check(retention_mode in('pending','retain','cleanup_after_grace','legacy_public','quarantine')),
  retain_reason text,
  legacy_audio_url text,
  source_private_verified_at timestamptz,
  source_delete_after timestamptz,
  source_deleted_at timestamptz,
  attached_at timestamptz,
  ready_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audio_assets_owner_created_idx on public.audio_assets(owner_id,created_at desc);
create index audio_assets_status_created_idx on public.audio_assets(status,created_at);
create index audio_assets_cleanup_idx on public.audio_assets(source_delete_after) where source_deleted_at is null and source_delete_after is not null;

create table public.audio_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  audio_asset_id uuid not null unique references public.audio_assets(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','processing','completed','failed','manual_review')),
  attempts integer not null default 0 check(attempts >= 0),
  max_attempts integer not null default 5 check(max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  worker_id uuid,
  claim_token uuid,
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audio_processing_jobs_due_idx on public.audio_processing_jobs(next_attempt_at,created_at)
  where status='pending';
create index audio_processing_jobs_lease_idx on public.audio_processing_jobs(lease_expires_at)
  where status='processing';

create table public.audio_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  audio_asset_id uuid references public.audio_assets(id) on delete set null,
  bucket_id text not null check(bucket_id in('audio-sources','audio-streams','uploads','audio-quarantine')),
  storage_path text not null check(char_length(storage_path) between 3 and 900),
  expected_sha256 text check(expected_sha256 is null or expected_sha256 ~ '^[a-f0-9]{64}$'),
  reason text not null check(reason in('free_source','replaced_source','replaced_stream','legacy_public_source','orphan_quarantine','quarantine_expired')),
  not_before timestamptz not null,
  status text not null default 'pending' check(status in('pending','processing','completed','retained','failed')),
  attempts integer not null default 0 check(attempts >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(bucket_id,storage_path)
);
create index audio_cleanup_queue_due_idx on public.audio_cleanup_queue(not_before,created_at)
  where status='pending';

create table public.audio_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check(mode in('inventory','legacy_registration','wav_migration','orphan_quarantine')),
  dry_run boolean not null default true,
  manifest_sha256 text check(manifest_sha256 is null or manifest_sha256 ~ '^[a-f0-9]{64}$'),
  scanned_count integer not null default 0 check(scanned_count >= 0),
  queued_count integer not null default 0 check(queued_count >= 0),
  repaired_count integer not null default 0 check(repaired_count >= 0),
  retained_count integer not null default 0 check(retained_count >= 0),
  failed_count integer not null default 0 check(failed_count >= 0),
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.audio_assets enable row level security;
alter table public.audio_processing_jobs enable row level security;
alter table public.audio_cleanup_queue enable row level security;
alter table public.audio_reconciliation_runs enable row level security;

revoke all on public.audio_assets,public.audio_processing_jobs,public.audio_cleanup_queue,public.audio_reconciliation_runs from public,anon,authenticated;
grant select on public.audio_assets to authenticated;
grant all on public.audio_assets,public.audio_processing_jobs,public.audio_cleanup_queue,public.audio_reconciliation_runs to service_role;

create policy audio_assets_owner_read on public.audio_assets for select to authenticated
using(owner_id=auth.uid() or public.is_platform_admin());

-- Signed upload URLs are minted by a server route after authenticating the
-- creator. Direct browser writes and all public writes remain denied.
drop policy if exists audio_sources_direct_insert on storage.objects;
drop policy if exists audio_sources_direct_update on storage.objects;
drop policy if exists audio_sources_direct_delete on storage.objects;
drop policy if exists audio_streams_direct_insert on storage.objects;
drop policy if exists audio_streams_direct_update on storage.objects;
drop policy if exists audio_streams_direct_delete on storage.objects;

create or replace function public.claim_audio_processing_job(target_worker_id uuid)
returns table(
  job_id uuid, claim_token uuid, attempts integer, asset_id uuid, owner_id uuid,
  track_id uuid, source_bucket text, source_path text, original_filename text,
  source_content_type text, source_byte_size bigint, retention_mode text
)
language plpgsql security definer set search_path=public as $$
declare selected_job public.audio_processing_jobs; next_token uuid:=gen_random_uuid();
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.audio_processing_jobs
  set status='pending',worker_id=null,claim_token=null,claimed_at=null,heartbeat_at=null,lease_expires_at=null,
      next_attempt_at=now(),last_error_code='stale_claim_recovered',updated_at=now()
  where status='processing' and lease_expires_at<now();
  if (select count(*) from public.audio_processing_jobs where status='processing' and lease_expires_at>now())>=2 then return; end if;
  select job.* into selected_job from public.audio_processing_jobs job
  where job.status='pending' and job.next_attempt_at<=now() and job.attempts<job.max_attempts
  order by job.next_attempt_at,job.created_at for update skip locked limit 1;
  if selected_job.id is null then return; end if;
  update public.audio_processing_jobs job set status='processing',attempts=job.attempts+1,worker_id=target_worker_id,
    claim_token=next_token,claimed_at=now(),heartbeat_at=now(),lease_expires_at=now()+interval '12 minutes',updated_at=now()
  where id=selected_job.id;
  update public.audio_assets set status='processing',failure_code=null,failure_message=null,updated_at=now()
  where id=selected_job.audio_asset_id;
  return query select selected_job.id,next_token,selected_job.attempts+1,asset.id,asset.owner_id,asset.track_id,
    asset.source_bucket,asset.source_path,asset.original_filename,asset.source_content_type,asset.source_byte_size,asset.retention_mode
  from public.audio_assets asset where asset.id=selected_job.audio_asset_id;
end;
$$;

create or replace function public.heartbeat_audio_processing_job(target_job_id uuid,target_claim_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.audio_processing_jobs set heartbeat_at=now(),lease_expires_at=now()+interval '12 minutes',updated_at=now()
  where id=target_job_id and status='processing' and claim_token=target_claim_token;
  return found;
end;
$$;

create or replace function public.complete_audio_processing_job(
  target_job_id uuid,target_claim_token uuid,target_source_sha256 text,target_source_codec text,
  target_source_duration_seconds numeric,target_stream_bucket text,target_stream_path text,
  target_stream_public_url text,target_stream_byte_size bigint,target_stream_sha256 text,
  target_stream_bitrate_kbps integer,target_stream_duration_seconds numeric,
  target_final_source_bucket text default null,target_final_source_path text default null,
  target_private_source_verified boolean default false
) returns uuid language plpgsql security definer set search_path=public as $$
declare active_job public.audio_processing_jobs; active_asset public.audio_assets;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select * into active_job from public.audio_processing_jobs where id=target_job_id and status='processing' and claim_token=target_claim_token for update;
  if active_job.id is null then raise exception 'Processing claim is no longer active.' using errcode='55000'; end if;
  select * into active_asset from public.audio_assets where id=active_job.audio_asset_id for update;
  if target_source_sha256 !~ '^[a-f0-9]{64}$' or target_stream_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid audio checksum.' using errcode='22023'; end if;
  if target_stream_bucket<>'audio-streams' then raise exception 'Invalid stream bucket.' using errcode='22023'; end if;
  if target_stream_byte_size<=0 or target_stream_duration_seconds<=0 then raise exception 'Invalid stream result.' using errcode='22023'; end if;
  update public.audio_assets set
    status='ready',source_sha256=target_source_sha256,source_codec=target_source_codec,
    source_duration_seconds=target_source_duration_seconds,
    source_bucket=coalesce(target_final_source_bucket,source_bucket),
    source_path=coalesce(target_final_source_path,source_path),
    source_private_verified_at=case when target_private_source_verified then now() else source_private_verified_at end,
    stream_bucket=target_stream_bucket,stream_path=target_stream_path,stream_public_url=target_stream_public_url,
    stream_content_type='audio/mpeg',stream_byte_size=target_stream_byte_size,stream_sha256=target_stream_sha256,
    stream_bitrate_kbps=target_stream_bitrate_kbps,stream_duration_seconds=target_stream_duration_seconds,
    ready_at=now(),failure_code=null,failure_message=null,updated_at=now()
  where id=active_asset.id;
  if active_asset.retention_mode='cleanup_after_grace' and active_asset.track_id is not null then
    update public.audio_assets set source_delete_after=now()+interval '7 days' where id=active_asset.id;
    insert into public.audio_cleanup_queue(audio_asset_id,bucket_id,storage_path,expected_sha256,reason,not_before)
    values(active_asset.id,coalesce(target_final_source_bucket,active_asset.source_bucket),coalesce(target_final_source_path,active_asset.source_path),target_source_sha256,'free_source',now()+interval '7 days')
    on conflict(bucket_id,storage_path) do nothing;
  end if;
  if target_private_source_verified and active_asset.source_bucket='uploads' and target_final_source_bucket='audio-sources' then
    insert into public.audio_cleanup_queue(audio_asset_id,bucket_id,storage_path,expected_sha256,reason,not_before)
    values(active_asset.id,active_asset.source_bucket,active_asset.source_path,target_source_sha256,'legacy_public_source',now()+interval '7 days')
    on conflict(bucket_id,storage_path) do nothing;
  end if;
  if active_asset.track_id is not null then
    update public.tracks set audio_url=target_stream_public_url,
      duration_seconds=coalesce(duration_seconds,round(target_stream_duration_seconds)::integer)
    where id=active_asset.track_id;
  end if;
  update public.audio_processing_jobs set status='completed',completed_at=now(),lease_expires_at=null,heartbeat_at=now(),updated_at=now()
  where id=active_job.id;
  return active_asset.id;
end;
$$;

create or replace function public.fail_audio_processing_job(
  target_job_id uuid,target_claim_token uuid,target_error_code text,target_error_message text,target_retryable boolean default true
) returns text language plpgsql security definer set search_path=public as $$
declare active_job public.audio_processing_jobs; next_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select * into active_job from public.audio_processing_jobs where id=target_job_id and status='processing' and claim_token=target_claim_token for update;
  if active_job.id is null then return 'stale'; end if;
  next_status:=case when target_retryable and active_job.attempts<active_job.max_attempts then 'pending' else 'failed' end;
  update public.audio_processing_jobs set status=next_status,worker_id=null,claim_token=null,claimed_at=null,heartbeat_at=null,lease_expires_at=null,
    next_attempt_at=case when next_status='pending' then now()+(interval '1 minute'*least(60,power(2,active_job.attempts)::integer)) else 'infinity'::timestamptz end,
    last_error_code=left(coalesce(target_error_code,'processing_failed'),80),last_error_message=left(coalesce(target_error_message,'Audio processing failed.'),500),updated_at=now()
  where id=active_job.id;
  update public.audio_assets set status=case when next_status='pending' then 'uploaded' else 'failed' end,
    failure_code=left(coalesce(target_error_code,'processing_failed'),80),failure_message=left(coalesce(target_error_message,'Audio processing failed.'),500),updated_at=now()
  where id=active_job.audio_asset_id;
  return next_status;
end;
$$;

create or replace function public.attach_ready_audio_asset(target_asset_id uuid,target_track_id uuid)
returns text language plpgsql security definer set search_path=public,auth as $$
declare asset public.audio_assets; target_item public.catalog_items; previous public.audio_assets; keep_source boolean; historical_download boolean;
begin
  select * into asset from public.audio_assets where id=target_asset_id for update;
  if asset.id is null or asset.owner_id<>auth.uid() or asset.status<>'ready' or asset.stream_public_url is null then
    raise exception 'Processed audio is not ready or does not belong to this creator.' using errcode='42501';
  end if;
  select item.* into target_item from public.tracks track join public.catalog_items item on item.id=track.item_id
  where track.id=target_track_id and public.can_manage_item(item.id) for update;
  if target_item.id is null then raise exception 'Track was not found.' using errcode='42501'; end if;
  select exists(select 1 from public.entitlements where item_id=target_item.id and entitlement_type='download') into historical_download;
  keep_source:=coalesce(target_item.download_purchase_enabled,false) or historical_download;
  select * into previous from public.audio_assets where track_id=target_track_id and id<>asset.id for update;
  if previous.id is not null then
    update public.audio_assets set track_id=null,updated_at=now() where id=previous.id;
    if previous.stream_bucket is not null and previous.stream_path is not null then
      insert into public.audio_cleanup_queue(audio_asset_id,bucket_id,storage_path,expected_sha256,reason,not_before)
      values(previous.id,previous.stream_bucket,previous.stream_path,previous.stream_sha256,'replaced_stream',now()+interval '7 days')
      on conflict(bucket_id,storage_path) do nothing;
    end if;
    if previous.retention_mode<>'retain' and previous.source_deleted_at is null then
      insert into public.audio_cleanup_queue(audio_asset_id,bucket_id,storage_path,expected_sha256,reason,not_before)
      values(previous.id,previous.source_bucket,previous.source_path,previous.source_sha256,'replaced_source',now()+interval '7 days')
      on conflict(bucket_id,storage_path) do nothing;
    end if;
  end if;
  update public.audio_assets set track_id=target_track_id,attached_at=now(),retention_mode=case when keep_source then 'retain' else 'cleanup_after_grace' end,
    retain_reason=case when target_item.download_purchase_enabled then 'paid_download_enabled' when historical_download then 'historical_download_entitlement' else null end,
    source_delete_after=case when keep_source then null else now()+interval '7 days' end,updated_at=now()
  where id=asset.id;
  update public.tracks set audio_url=asset.stream_public_url,
    duration_seconds=coalesce(duration_seconds,round(asset.stream_duration_seconds)::integer)
  where id=target_track_id;
  if not keep_source then
    insert into public.audio_cleanup_queue(audio_asset_id,bucket_id,storage_path,expected_sha256,reason,not_before)
    values(asset.id,asset.source_bucket,asset.source_path,asset.source_sha256,'free_source',now()+interval '7 days')
    on conflict(bucket_id,storage_path) do update set not_before=greatest(public.audio_cleanup_queue.not_before,excluded.not_before),status='pending';
  end if;
  return case when keep_source then 'retain' else 'cleanup_after_grace' end;
end;
$$;

create or replace function public.retry_owned_audio_asset(target_asset_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not exists(select 1 from public.audio_assets where id=target_asset_id and owner_id=auth.uid() and status='failed') then
    raise exception 'Failed audio upload was not found.' using errcode='42501';
  end if;
  update public.audio_assets set status='uploaded',failure_code=null,failure_message=null,updated_at=now() where id=target_asset_id;
  update public.audio_processing_jobs set status='pending',attempts=0,next_attempt_at=now(),worker_id=null,claim_token=null,claimed_at=null,
    heartbeat_at=null,lease_expires_at=null,completed_at=null,last_error_code=null,last_error_message=null,updated_at=now()
  where audio_asset_id=target_asset_id;
end;
$$;

create or replace function public.attach_ready_audio_assets(target_pairs jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare pair jsonb; attached jsonb:='[]'::jsonb; asset_id uuid; track_id uuid; retention text;
begin
  if jsonb_typeof(target_pairs)<>'array' or jsonb_array_length(target_pairs)<1 or jsonb_array_length(target_pairs)>200 then
    raise exception 'Provide between one and 200 audio attachments.' using errcode='22023';
  end if;
  if (select count(*) from jsonb_array_elements(target_pairs) value
      where not (value ? 'asset_id') or not (value ? 'track_id'))>0 then
    raise exception 'Every audio attachment needs an asset and track.' using errcode='22023';
  end if;
  if (select count(distinct value->>'asset_id')<>count(*) or count(distinct value->>'track_id')<>count(*)
      from jsonb_array_elements(target_pairs) value) then
    raise exception 'Audio attachments cannot contain duplicate assets or tracks.' using errcode='22023';
  end if;
  -- Every validation and attachment runs in this transaction. Any failure rolls
  -- back the entire release instead of leaving a partly attached track list.
  for pair in select value from jsonb_array_elements(target_pairs) value loop
    asset_id:=(pair->>'asset_id')::uuid;
    track_id:=(pair->>'track_id')::uuid;
    retention:=public.attach_ready_audio_asset(asset_id,track_id);
    attached:=attached||jsonb_build_array(jsonb_build_object('asset_id',asset_id,'track_id',track_id,'retention_mode',retention));
  end loop;
  return attached;
end;
$$;

create or replace function public.audio_source_can_be_deleted(target_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.audio_assets asset
    left join public.tracks track on track.id=asset.track_id
    left join public.catalog_items item on item.id=track.item_id
    where asset.id=target_asset_id and asset.status='ready' and asset.retention_mode='cleanup_after_grace'
      and asset.source_deleted_at is null and asset.source_delete_after<=now()
      and coalesce(item.download_purchase_enabled,false)=false
      and not exists(select 1 from public.entitlements entitlement where entitlement.item_id=item.id and entitlement.entitlement_type='download')
  )
$$;

create or replace function public.audio_cleanup_entry_can_run(target_entry_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((
    select case
      when entry.reason='free_source' then public.audio_source_can_be_deleted(entry.audio_asset_id)
      when entry.reason='replaced_source' then asset.retention_mode<>'retain' and asset.track_id is null
        and not exists(select 1 from public.audio_assets other where other.id<>asset.id and other.source_bucket=entry.bucket_id and other.source_path=entry.storage_path and other.source_deleted_at is null)
      when entry.reason='replaced_stream' then asset.track_id is null
        and not exists(select 1 from public.audio_assets other where other.id<>asset.id and other.stream_bucket=entry.bucket_id and other.stream_path=entry.storage_path)
        and not exists(select 1 from public.tracks track where track.audio_url=asset.stream_public_url)
      when entry.reason='legacy_public_source' then asset.source_private_verified_at is not null
        and asset.source_bucket='audio-sources' and asset.source_sha256=entry.expected_sha256
        and entry.bucket_id='uploads'
      when entry.reason='quarantine_expired' then entry.bucket_id='audio-quarantine' and entry.not_before<=now()
      else false
    end
    from public.audio_cleanup_queue entry left join public.audio_assets asset on asset.id=entry.audio_asset_id
    where entry.id=target_entry_id and entry.status in('pending','processing') and entry.not_before<=now()
  ),false)
$$;

create or replace function public.claim_audio_cleanup_entry(target_worker_id uuid)
returns table(entry_id uuid,claim_token uuid,audio_asset_id uuid,bucket_id text,storage_path text,expected_sha256 text,reason text)
language plpgsql security definer set search_path=public as $$
declare selected_entry public.audio_cleanup_queue; next_token uuid:=gen_random_uuid();
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  update public.audio_cleanup_queue set status='pending',claim_token=null,claimed_at=null,lease_expires_at=null,last_error='stale_cleanup_claim_recovered'
  where status='processing' and lease_expires_at<now();
  select entry.* into selected_entry from public.audio_cleanup_queue entry
  where entry.status='pending' and entry.not_before<=now() and entry.attempts<5
  order by entry.not_before,entry.created_at for update skip locked limit 1;
  if selected_entry.id is null then return; end if;
  update public.audio_cleanup_queue entry set status='processing',attempts=entry.attempts+1,claim_token=next_token,
    claimed_at=now(),lease_expires_at=now()+interval '20 minutes'
  where entry.id=selected_entry.id;
  return query select selected_entry.id,next_token,selected_entry.audio_asset_id,selected_entry.bucket_id,
    selected_entry.storage_path,selected_entry.expected_sha256,selected_entry.reason;
end;
$$;

create or replace function public.complete_audio_cleanup_entry(
  target_entry_id uuid,target_claim_token uuid,target_result text,target_error text default null
) returns void language plpgsql security definer set search_path=public as $$
declare entry public.audio_cleanup_queue;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_result not in('completed','retained','failed') then raise exception 'Invalid cleanup result.' using errcode='22023'; end if;
  select * into entry from public.audio_cleanup_queue where id=target_entry_id and status='processing' and claim_token=target_claim_token for update;
  if entry.id is null then raise exception 'Cleanup claim is no longer active.' using errcode='55000'; end if;
  update public.audio_cleanup_queue set status=target_result,completed_at=case when target_result in('completed','retained') then now() else null end,
    last_error=left(target_error,500),claim_token=null,lease_expires_at=null
  where id=entry.id;
  if target_result='completed' and entry.audio_asset_id is not null and entry.reason in('free_source','replaced_source') then
    update public.audio_assets set source_deleted_at=now(),updated_at=now()
    where id=entry.audio_asset_id and source_bucket=entry.bucket_id and source_path=entry.storage_path;
  end if;
end;
$$;

revoke all on function public.claim_audio_processing_job(uuid) from public,anon,authenticated;
revoke all on function public.heartbeat_audio_processing_job(uuid,uuid) from public,anon,authenticated;
revoke all on function public.complete_audio_processing_job(uuid,uuid,text,text,numeric,text,text,text,bigint,text,integer,numeric,text,text,boolean) from public,anon,authenticated;
revoke all on function public.fail_audio_processing_job(uuid,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.audio_source_can_be_deleted(uuid) from public,anon,authenticated;
revoke all on function public.audio_cleanup_entry_can_run(uuid) from public,anon,authenticated;
revoke all on function public.claim_audio_cleanup_entry(uuid) from public,anon,authenticated;
revoke all on function public.complete_audio_cleanup_entry(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.attach_ready_audio_asset(uuid,uuid) from public,anon;
revoke all on function public.attach_ready_audio_assets(jsonb) from public,anon;
revoke all on function public.retry_owned_audio_asset(uuid) from public,anon;
grant execute on function public.claim_audio_processing_job(uuid),public.heartbeat_audio_processing_job(uuid,uuid),
  public.complete_audio_processing_job(uuid,uuid,text,text,numeric,text,text,text,bigint,text,integer,numeric,text,text,boolean),
  public.fail_audio_processing_job(uuid,uuid,text,text,boolean),public.audio_source_can_be_deleted(uuid),
  public.audio_cleanup_entry_can_run(uuid),public.claim_audio_cleanup_entry(uuid),public.complete_audio_cleanup_entry(uuid,uuid,text,text) to service_role;
grant execute on function public.attach_ready_audio_asset(uuid,uuid),public.attach_ready_audio_assets(jsonb),public.retry_owned_audio_asset(uuid) to authenticated,service_role;

comment on table public.audio_assets is 'One immutable source and verified streaming derivative per Studio audio upload. Existing legacy MP3s may be registered without copying.';
comment on table public.audio_cleanup_queue is 'Delayed, service-only cleanup queue. Every deletion must be re-authorized immediately before object removal.';

commit;
