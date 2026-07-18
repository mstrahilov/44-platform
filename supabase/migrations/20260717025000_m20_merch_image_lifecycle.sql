begin;

-- 44OS owns presentation artwork. Printful sync may change provider variants,
-- never a featured image or its durable storage identity.
alter table public.merch_product_images
  add column if not exists content_sha256 text,
  add column if not exists content_type text,
  add column if not exists byte_size bigint,
  add column if not exists original_filename text,
  add column if not exists is_featured boolean not null default false;

alter table public.merch_product_images
  add constraint merch_product_images_sha256_check
    check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint merch_product_images_content_type_check
    check (content_type is null or content_type in ('image/jpeg','image/png','image/webp','image/avif')),
  add constraint merch_product_images_byte_size_check
    check (byte_size is null or byte_size > 0),
  add constraint merch_product_images_original_filename_check
    check (original_filename is null or char_length(original_filename) between 1 and 180);

-- The former main role is a featured selection, not a separate stored image.
update public.merch_product_images set is_featured=true where role='main';
update public.merch_product_images set role='bonus' where role='main';
alter table public.merch_product_images
  drop constraint if exists merch_product_images_role_check,
  add constraint merch_product_images_role_check check (role in ('color','bonus')),
  drop constraint if exists merch_product_images_color_value_check,
  add constraint merch_product_images_color_value_check check (
    (role='color' and color_value is not null and char_length(btrim(color_value)) between 1 and 80)
    or (role='bonus' and color_value is null)
  );
drop index if exists public.merch_product_images_one_main_idx;
create unique index merch_product_images_one_featured_idx
  on public.merch_product_images(item_id) where is_featured;
create unique index merch_product_images_item_hash_idx
  on public.merch_product_images(item_id,content_sha256) where content_sha256 is not null;

create table public.merch_storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path ~ '^merch/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  reason text not null check (reason in ('replaced','deleted','unreferenced')),
  not_before timestamptz not null default now() + interval '15 minutes',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index merch_storage_cleanup_due_idx
  on public.merch_storage_cleanup_queue(not_before,created_at)
  where completed_at is null;
alter table public.merch_storage_cleanup_queue enable row level security;
revoke all on public.merch_storage_cleanup_queue from public,anon,authenticated;
grant all on public.merch_storage_cleanup_queue to service_role;

create table public.merch_storage_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  scanned_count integer not null default 0 check (scanned_count >= 0),
  queued_count integer not null default 0 check (queued_count >= 0),
  removed_count integer not null default 0 check (removed_count >= 0),
  retained_count integer not null default 0 check (retained_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  notes text
);
alter table public.merch_storage_reconciliation_runs enable row level security;
revoke all on public.merch_storage_reconciliation_runs from public,anon,authenticated;
grant all on public.merch_storage_reconciliation_runs to service_role;

create or replace function public.set_merch_product_image_v2(
  target_item_id uuid, target_role text, target_color_value text, target_title text,
  target_file_url text, target_storage_path text, target_created_by uuid,
  target_content_sha256 text, target_content_type text, target_byte_size bigint,
  target_original_filename text, target_featured boolean default false
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images; resolved_id uuid; next_order integer; replacement text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_role not in ('color','bonus') or target_content_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid Merch image assignment.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_item_id::text,0));
  select * into existing from public.merch_product_images
  where item_id=target_item_id and (
    (target_role='color' and role='color' and lower(btrim(color_value))=lower(btrim(target_color_value)))
    or (target_role='bonus' and content_sha256=target_content_sha256)
  ) for update;
  if existing.id is not null and existing.content_sha256=target_content_sha256 then
    return jsonb_build_object('id',existing.id,'idempotent',true,'replaced_storage_path',null);
  end if;
  if existing.id is not null then
    replacement:=existing.storage_path;
    update public.merch_product_images set title=target_title,file_url=target_file_url,storage_path=target_storage_path,
      content_sha256=target_content_sha256,content_type=target_content_type,byte_size=target_byte_size,
      original_filename=target_original_filename,created_by=target_created_by,is_featured=target_featured
    where id=existing.id returning id into resolved_id;
  else
    select coalesce(max(sort_order),-1)+1 into next_order from public.merch_product_images where item_id=target_item_id;
    insert into public.merch_product_images(item_id,role,color_value,title,file_url,storage_path,sort_order,created_by,content_sha256,content_type,byte_size,original_filename,is_featured)
    values(target_item_id,target_role,case when target_role='color' then nullif(btrim(target_color_value),'') else null end,target_title,target_file_url,target_storage_path,next_order,target_created_by,target_content_sha256,target_content_type,target_byte_size,target_original_filename,target_featured)
    returning id into resolved_id;
  end if;
  if target_featured then
    update public.merch_product_images set is_featured=false where item_id=target_item_id and id<>resolved_id and is_featured;
    update public.catalog_items set cover_url=target_file_url,updated_at=now() where id=target_item_id;
  end if;
  if target_role='color' then update public.merch_variants set image_url=target_file_url where item_id=target_item_id and lower(btrim(option_values->>'color'))=lower(btrim(target_color_value)); end if;
  if replacement is not null and not exists(select 1 from public.merch_product_images where storage_path=replacement) then
    insert into public.merch_storage_cleanup_queue(storage_path,reason) values(replacement,'replaced') on conflict(storage_path) do nothing;
  end if;
  return jsonb_build_object('id',resolved_id,'idempotent',false,'replaced_storage_path',replacement);
end;
$$;

create or replace function public.delete_merch_product_image_v2(target_image_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images; item_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select image into existing from public.merch_product_images image where image.id=target_image_id for update;
  if existing.id is null then return jsonb_build_object('deleted',false); end if;
  select status into item_status from public.catalog_items where id=existing.item_id;
  if existing.is_featured and item_status='published' then raise exception 'A published Merch Item needs a replacement featured image first.' using errcode='55000'; end if;
  delete from public.merch_product_images where id=existing.id;
  if existing.role='color' then update public.merch_variants set image_url=null where item_id=existing.item_id and image_url=existing.file_url; end if;
  if existing.is_featured then update public.catalog_items set cover_url=null,updated_at=now() where id=existing.item_id and cover_url=existing.file_url; end if;
  if not exists(select 1 from public.merch_product_images where storage_path=existing.storage_path) then insert into public.merch_storage_cleanup_queue(storage_path,reason) values(existing.storage_path,'deleted') on conflict(storage_path) do nothing; end if;
  return jsonb_build_object('deleted',true);
end;
$$;

create or replace function public.update_merch_product_image_v2(
  target_image_id uuid, target_featured boolean, target_sort_order integer
) returns void language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if target_sort_order < 0 then raise exception 'Invalid Merch image order.' using errcode='22023'; end if;
  select * into existing from public.merch_product_images where id=target_image_id for update;
  if existing.id is null then raise exception 'Merch image was not found.' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(existing.item_id::text,0));
  if target_featured then
    update public.merch_product_images set is_featured=false where item_id=existing.item_id and is_featured;
    update public.catalog_items set cover_url=existing.file_url,updated_at=now() where id=existing.item_id;
  elsif existing.is_featured then
    raise exception 'Choose a replacement featured image before unsetting it.' using errcode='55000';
  end if;
  update public.merch_product_images set is_featured=target_featured,sort_order=target_sort_order where id=existing.id;
end;
$$;

-- Compatibility wrappers preserve the already-deployed service RPC surface
-- while routing old callers into the featured-image model.
create or replace function public.set_merch_product_image(
  target_item_id uuid,target_role text,target_color_value text,target_title text,
  target_file_url text,target_storage_path text,target_created_by uuid
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin
  return public.set_merch_product_image_v2(
    target_item_id, case when target_role='main' then 'bonus' else target_role end,
    target_color_value,target_title,target_file_url,target_storage_path,target_created_by,
    encode(digest(target_storage_path,'sha256'),'hex'),'image/jpeg',1,null,target_role='main'
  );
end;
$$;
create or replace function public.delete_merch_product_image(target_image_id uuid)
returns jsonb language sql security definer set search_path=public,auth as $$
  select public.delete_merch_product_image_v2(target_image_id)
$$;

revoke all on function public.set_merch_product_image_v2(uuid,text,text,text,text,text,uuid,text,text,bigint,text,boolean) from public,anon,authenticated;
revoke all on function public.delete_merch_product_image_v2(uuid) from public,anon,authenticated;
revoke all on function public.update_merch_product_image_v2(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.set_merch_product_image_v2(uuid,text,text,text,text,text,uuid,text,text,bigint,text,boolean) to service_role;
grant execute on function public.delete_merch_product_image_v2(uuid) to service_role;
grant execute on function public.update_merch_product_image_v2(uuid,boolean,integer) to service_role;

comment on table public.merch_storage_cleanup_queue is 'Service-only, bounded delayed cleanup queue. Workers may delete only safe merch/ paths after the database swap is committed.';
commit;
