-- M8 cutover after both source PDFs were copied to item-files and verified.

update public.item_assets
set file_url = null,
    storage_path = 'fa36ff74-bbd0-4c73-adfd-72aa391255cb/1b902d98-d636-41e4-a7be-dae020240f4c/8d0bb231-1b4b-478e-8df1-22872d5ef10e/everything-before.pdf'
where id = '8d0bb231-1b4b-478e-8df1-22872d5ef10e'
  and item_id = 'fa36ff74-bbd0-4c73-adfd-72aa391255cb';

update public.item_assets
set file_url = null,
    storage_path = 'fbb25342-c1d4-46ed-9dbc-37a46795a58d/1b902d98-d636-41e4-a7be-dae020240f4c/4c360237-37bf-4c6e-a71b-e873d0c007bc/book-of-confluence-vol-i.pdf'
where id = '4c360237-37bf-4c6e-a71b-e873d0c007bc'
  and item_id = 'fbb25342-c1d4-46ed-9dbc-37a46795a58d';

-- These two free books were already in Library with directly reachable PDFs.
-- Preserve that access as explicit, auditable download entitlements.
with inserted as (
  insert into public.entitlements (
    user_id, item_id, entitlement_type, status, source_type, source_id, granted_at
  )
  select entry.user_id, entry.item_id, 'download', 'active', 'legacy_library', entry.id, entry.acquired_at
  from public.library_entries entry
  where entry.item_id in (
    'fa36ff74-bbd0-4c73-adfd-72aa391255cb'::uuid,
    'fbb25342-c1d4-46ed-9dbc-37a46795a58d'::uuid
  )
  on conflict (user_id, item_id, entitlement_type) do nothing
  returning *
)
insert into public.entitlement_events (
  entitlement_id, user_id, item_id, entitlement_type, operation,
  source_type, source_id, actor_id, reason, metadata, created_at
)
select id, user_id, item_id, entitlement_type, 'grant', source_type, source_id,
  null, 'M8 preserved access while moving a legacy public book file to private storage.',
  jsonb_build_object('migration', '20260712054100'), now()
from inserted;

comment on column public.item_assets.storage_path is 'Path in the private item-files bucket. Authorized clients receive short-lived signed URLs; protected locations are never public catalog URLs.';
