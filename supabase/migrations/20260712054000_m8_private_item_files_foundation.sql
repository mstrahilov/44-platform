-- M8 private asset delivery foundation. Existing objects are copied and verified
-- before a later cutover migration changes item_assets references.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-files',
  'item-files',
  false,
  524288000,
  array[
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_item_file(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.item_assets asset
    where asset.storage_path = object_name
      and (
        public.can_manage_item(asset.item_id)
        or (
          asset.asset_type in ('bonus_content', 'bonus_achievement')
          and public.has_item_entitlement(auth.uid(), asset.item_id, 'bonus_content')
        )
        or (
          asset.is_downloadable
          and public.has_item_entitlement(auth.uid(), asset.item_id, 'download')
        )
        or (
          not asset.is_downloadable
          and asset.asset_type not in ('bonus_content', 'bonus_achievement')
          and public.has_item_entitlement(auth.uid(), asset.item_id, 'library_access')
        )
      )
  );
$$;

revoke all on function public.can_access_item_file(text) from public, anon;
grant execute on function public.can_access_item_file(text) to authenticated, service_role;

drop policy if exists item_files_authorized_read on storage.objects;
create policy item_files_authorized_read on storage.objects for select to authenticated
using (bucket_id = 'item-files' and public.can_access_item_file(name));

drop policy if exists item_files_creator_insert on storage.objects;
create policy item_files_creator_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-files'
  and owner_id = auth.uid()::text
  and public.is_approved_publisher(auth.uid())
  and auth.uid()::text = any(storage.foldername(name))
);

drop policy if exists item_files_creator_update on storage.objects;
create policy item_files_creator_update on storage.objects for update to authenticated
using (bucket_id = 'item-files' and owner_id = auth.uid()::text)
with check (
  bucket_id = 'item-files'
  and owner_id = auth.uid()::text
  and public.is_approved_publisher(auth.uid())
  and auth.uid()::text = any(storage.foldername(name))
);

drop policy if exists item_files_creator_delete on storage.objects;
create policy item_files_creator_delete on storage.objects for delete to authenticated
using (bucket_id = 'item-files' and owner_id = auth.uid()::text and public.is_approved_publisher(auth.uid()));

comment on function public.can_access_item_file(text) is 'Authorizes private item-files objects from the matching item_assets row and server-issued entitlement.';
