-- M10 curated creator publishing boundary.
-- This migration is additive and does not delete or rewrite catalog/user history.

create or replace function public.is_approved_publisher(target_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = target_profile_id and role in ('creator', 'admin')
  );
$$;

revoke all on function public.is_approved_publisher(uuid) from public;
grant execute on function public.is_approved_publisher(uuid) to anon, authenticated, service_role;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_platform_admin() then
    raise exception 'Profile roles are approval-managed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update of role on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.set_profile_role(target_profile_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator approval is required.' using errcode = '42501';
  end if;
  if target_role not in ('member', 'creator', 'admin') then
    raise exception 'Invalid profile role.' using errcode = '22023';
  end if;
  update public.profiles set role = target_role where id = target_profile_id;
  if not found then raise exception 'Profile not found.' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.set_profile_role(uuid, text) from public;
grant execute on function public.set_profile_role(uuid, text) to authenticated, service_role;

create or replace function public.can_manage_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or (
    public.is_approved_publisher(auth.uid()) and (
      exists (select 1 from public.catalog_items i where i.id = target_item_id and i.author_id = auth.uid())
      or exists (
        select 1 from public.item_members im
        where im.item_id = target_item_id and im.profile_id = auth.uid()
          and im.member_role in ('owner', 'editor')
      )
    )
  );
$$;

create or replace function public.catalog_item_health(target_item_id uuid)
returns table(code text, message text)
language sql
stable
security definer
set search_path = public
as $$
  with item as (select * from public.catalog_items where id = target_item_id)
  select 'missing_title', 'Add an Item title.' from item where nullif(btrim(title), '') is null
  union all select 'missing_creator', 'Add a creator name.' from item where nullif(btrim(creator), '') is null
  union all select 'missing_category', 'Choose a Category.' from item where item_category_id is null
  union all select 'missing_type', 'Choose an approved Item Type.' from item where not exists (
    select 1 from public.item_type_assignments a join public.item_types t on t.id = a.item_type_id
    where a.item_id = target_item_id and t.is_active and t.category_id = item.item_category_id
  )
  union all select 'missing_artwork', 'Upload catalog artwork.' from item where nullif(btrim(cover_url), '') is null
  union all select 'invalid_year', 'Use a release year between 1000 and next year.' from item
    where year is not null and (year < 1000 or year > extract(year from now())::integer + 1)
  union all select 'missing_music_tracks', 'Music needs at least one complete audio track.' from item
    where experience_type = 'music' and not exists (
      select 1 from public.tracks where item_id = target_item_id
        and nullif(btrim(title), '') is not null and nullif(btrim(audio_url), '') is not null
    )
  union all select 'incomplete_music_track', 'Every music track needs a title and audio file.' from item
    where experience_type = 'music' and exists (
      select 1 from public.tracks where item_id = target_item_id
        and (nullif(btrim(title), '') is null or nullif(btrim(audio_url), '') is null)
    )
  union all select 'missing_book_file', 'Books need an uploaded book file.' from item
    where experience_type = 'book' and not exists (
      select 1 from public.item_assets where item_id = target_item_id and asset_type = 'book'
        and coalesce(nullif(btrim(storage_path), ''), nullif(btrim(file_url), '')) is not null
    )
  union all select 'missing_asset_file', 'Assets need an uploaded downloadable file.' from item
    where experience_type = 'asset' and not exists (
      select 1 from public.item_assets where item_id = target_item_id
        and asset_type in ('sample_pack', 'music', 'template', 'other') and is_downloadable
        and coalesce(nullif(btrim(storage_path), ''), nullif(btrim(file_url), '')) is not null
    );
$$;

revoke all on function public.catalog_item_health(uuid) from public;
grant execute on function public.catalog_item_health(uuid) to authenticated, service_role;

create or replace function public.set_owned_item_publication_status(target_item_id uuid, target_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare problem record;
begin
  if target_status not in ('draft', 'published') then
    raise exception 'Invalid publication status.' using errcode = '22023';
  end if;
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or publishing is not approved for this account.' using errcode = '42501';
  end if;
  if exists (select 1 from public.catalog_items where id = target_item_id and status = 'archived') then
    raise exception 'Archived Items cannot be republished.' using errcode = '55000';
  end if;
  if target_status = 'published' then
    select * into problem from public.catalog_item_health(target_item_id) limit 1;
    if found then raise exception 'Publication blocked: %', problem.message using errcode = '23514'; end if;
  end if;
  update public.catalog_items set status = target_status, updated_at = now() where id = target_item_id;
end;
$$;

revoke all on function public.set_owned_item_publication_status(uuid, text) from public;
grant execute on function public.set_owned_item_publication_status(uuid, text) to authenticated, service_role;

drop policy if exists products_insert_own on public.catalog_items;
create policy products_insert_own on public.catalog_items for insert to authenticated
with check (author_id = auth.uid() and status = 'draft' and public.is_approved_publisher(auth.uid()));

drop policy if exists products_update_own on public.catalog_items;
create policy products_update_own on public.catalog_items for update to authenticated
using (public.can_manage_item(id) and status <> 'archived')
with check (public.can_manage_item(id) and status = 'draft');

-- Publication is RPC-only; direct authenticated updates cannot set published.
revoke insert, update, delete on public.catalog_items from anon;

-- Upload mutation is scoped to the object owner. Creator catalog roots additionally
-- require an approved publisher; fan profile/editor uploads remain available.
drop policy if exists "Authenticated users can upload files" on storage.objects;
create policy "Authenticated users can upload owned files" on storage.objects for insert to authenticated
with check (
  bucket_id = 'uploads' and owner_id = auth.uid()::text
  and auth.uid()::text = any(storage.foldername(name))
  and (coalesce((storage.foldername(name))[1], '') not in ('products', 'tracks') or public.is_approved_publisher(auth.uid()))
);

drop policy if exists "Authenticated users can update their uploads" on storage.objects;
create policy "Authenticated users can update owned files" on storage.objects for update to authenticated
using (bucket_id = 'uploads' and (owner_id = auth.uid()::text or auth.uid()::text = any(storage.foldername(name))))
with check (bucket_id = 'uploads' and owner_id = auth.uid()::text and auth.uid()::text = any(storage.foldername(name)));

drop policy if exists "Authenticated users can delete their uploads" on storage.objects;
create policy "Authenticated users can delete owned files" on storage.objects for delete to authenticated
using (bucket_id = 'uploads' and (owner_id = auth.uid()::text or auth.uid()::text = any(storage.foldername(name))));

comment on function public.catalog_item_health(uuid) is 'Server-authoritative, read-only publication health findings for one permanent Item.';
comment on function public.set_owned_item_publication_status(uuid, text) is 'Only supported creator publication transition; validates approval, ownership, lifecycle, taxonomy, artwork, and category media.';
