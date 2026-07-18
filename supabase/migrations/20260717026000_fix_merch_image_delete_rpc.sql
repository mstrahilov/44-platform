-- Correct the v2 image-delete RPC record lookup. Selecting the row alias coerces
-- the composite value into the UUID variable instead of loading the full record.
begin;

create or replace function public.delete_merch_product_image_v2(target_image_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images; item_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  select * into existing from public.merch_product_images where id=target_image_id for update;
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

commit;
