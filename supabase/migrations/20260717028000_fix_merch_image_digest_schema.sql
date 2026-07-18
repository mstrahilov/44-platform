begin;

-- Keep the deployed compatibility wrapper executable under its restricted
-- search path. pgcrypto is installed in extensions, not public.
create or replace function public.set_merch_product_image_v2(
  target_item_id uuid,target_role text,target_color_value text,target_title text,
  target_file_url text,target_storage_path text,target_created_by uuid,target_content_sha256 text,
  target_content_type text,target_byte_size bigint,target_original_filename text,target_featured boolean default false
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
    (target_featured and is_featured)
    or
    (target_role='color' and role='color' and lower(btrim(color_value))=lower(btrim(target_color_value)))
    or (target_role='bonus' and content_sha256=target_content_sha256)
  ) for update;
  if existing.id is not null and existing.content_sha256=target_content_sha256 then
    return jsonb_build_object('id',existing.id,'idempotent',true,'replaced_storage_path',null);
  end if;
  -- Clear the prior feature before either insert or update so the unique index
  -- observes a single featured row throughout the atomic replacement.
  if target_featured then
    update public.merch_product_images set is_featured=false
    where item_id=target_item_id and (existing.id is null or id<>existing.id) and is_featured;
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
  if target_featured then update public.catalog_items set cover_url=target_file_url,updated_at=now() where id=target_item_id; end if;
  if target_role='color' then update public.merch_variants set image_url=target_file_url where item_id=target_item_id and lower(btrim(option_values->>'color'))=lower(btrim(target_color_value)); end if;
  if replacement is not null and not exists(select 1 from public.merch_product_images where storage_path=replacement) then
    insert into public.merch_storage_cleanup_queue(storage_path,reason) values(replacement,'replaced') on conflict(storage_path) do nothing;
  end if;
  return jsonb_build_object('id',resolved_id,'idempotent',false,'replaced_storage_path',replacement);
end;
$$;

create or replace function public.set_merch_product_image(
  target_item_id uuid,target_role text,target_color_value text,target_title text,
  target_file_url text,target_storage_path text,target_created_by uuid
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin
  return public.set_merch_product_image_v2(
    target_item_id, case when target_role='main' then 'bonus' else target_role end,
    target_color_value,target_title,target_file_url,target_storage_path,target_created_by,
    encode(extensions.digest(target_storage_path,'sha256'),'hex'),'image/jpeg',1,null,target_role='main'
  );
end;
$$;

commit;
