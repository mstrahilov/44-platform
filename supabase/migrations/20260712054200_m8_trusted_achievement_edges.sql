-- M8 closes externally callable internal grant helpers and makes Signal Boost
-- evidence server-authoritative and non-self-referential.

revoke execute on function public.issue_item_achievement(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.grant_achievement_entitlement(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.grant_user_achievement_entitlements() from public, anon, authenticated;
revoke execute on function public.unlock_signal_boost_from_share_visit() from public, anon, authenticated;
grant execute on function public.issue_item_achievement(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.grant_achievement_entitlement(uuid, uuid, text, uuid) to service_role;

drop policy if exists product_share_visits_insert_auth on public.item_share_visits;
revoke insert, update, delete on public.item_share_visits from anon, authenticated;

create unique index if not exists item_share_visits_one_visitor_evidence_idx
on public.item_share_visits(item_id, referrer_id, visitor_id)
where visitor_id is not null;

create or replace function public.record_item_share_visit(target_item_id uuid, target_referrer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_visitor uuid := auth.uid();
  inserted_count integer := 0;
begin
  if active_visitor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_referrer_id is null or target_referrer_id = active_visitor then return false; end if;
  if not exists (
    select 1 from public.catalog_items item
    where item.id = target_item_id and item.status = 'published'
  ) then return false; end if;
  if not public.has_item_entitlement(target_referrer_id, target_item_id, 'library_access') then return false; end if;

  insert into public.item_share_visits(item_id, referrer_id, visitor_id)
  values(target_item_id, target_referrer_id, active_visitor)
  on conflict (item_id, referrer_id, visitor_id) where visitor_id is not null do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count > 0;
end;
$$;

revoke all on function public.record_item_share_visit(uuid, uuid) from public, anon;
grant execute on function public.record_item_share_visit(uuid, uuid) to authenticated, service_role;

comment on function public.record_item_share_visit(uuid, uuid) is 'Records one authenticated non-self visitor as trusted Signal Boost evidence; duplicate visits are idempotent.';

create or replace function public.enforce_private_protected_item_asset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_downloadable or new.asset_type in ('bonus_content', 'bonus_achievement') then
    if nullif(btrim(new.storage_path), '') is null or new.file_url is not null then
      raise exception 'Downloadable and bonus assets must use private item-files storage.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_private_protected_item_asset on public.item_assets;
create trigger enforce_private_protected_item_asset
before insert or update of asset_type, file_url, storage_path, is_downloadable on public.item_assets
for each row execute function public.enforce_private_protected_item_asset();

revoke execute on function public.enforce_private_protected_item_asset() from public, anon, authenticated;
