begin;

-- Component flags used to default to true when the component system was first
-- introduced. Make achievements an explicit flag as well; achievement rows are
-- not a reliable signal because an earlier migration seeded templates on every
-- music release.
alter table public.catalog_items
  add column if not exists achievements_enabled boolean not null default false;

create or replace function public.set_owned_item_achievements_enabled(target_item_id uuid, target_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item not found or not editable by this account.' using errcode='42501';
  end if;
  update public.catalog_items
  set achievements_enabled = coalesce(target_enabled, false), updated_at = now()
  where id = target_item_id and status <> 'archived';
end;
$$;

revoke all on function public.set_owned_item_achievements_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_owned_item_achievements_enabled(uuid, boolean) to authenticated, service_role;

-- Normalize legacy flags from the data they are meant to expose. This only
-- changes section visibility flags; it does not delete content or history.
update public.catalog_items item
set external_links_enabled = false
where item.external_links_enabled
  and not exists (
    select 1 from public.item_external_links link
    where link.item_id = item.id and nullif(btrim(link.url), '') is not null
  );

update public.catalog_items item
set visuals_enabled = false
where item.visuals_enabled
  and not exists (
    select 1 from public.item_video_attachments attachment
    where attachment.item_id = item.id
  );

update public.catalog_items item
set related_items_enabled = false
where item.related_items_enabled
  and not exists (
    select 1 from public.item_related_items related
    where related.item_id = item.id
  );

update public.catalog_items
set download_purchase_enabled = false
where download_purchase_enabled
  and (is_free or price_cents <= 0)
  -- Published legacy Sample Packs are grandfathered by the existing trigger;
  -- leave those untouched rather than turning a cleanup into a publish block.
  and not (status = 'published' and experience_type = 'asset');

-- Preserve achievement visibility only where somebody has actually unlocked an
-- achievement. Unused seeded templates are removed for disabled sections so
-- older iOS clients, which infer visibility from rows, also close the section.
-- Earned rows are never removed; their unlock/history relationships remain
-- intact and creators can re-enable the section in Studio later.
update public.catalog_items item
set achievements_enabled = exists (
  select 1
  from public.user_achievements unlocked
  join public.item_achievements achievement on achievement.id = unlocked.achievement_id
  where unlocked.item_id = item.id
);

delete from public.item_achievements achievement
where not exists (
    select 1 from public.user_achievements unlocked
    where unlocked.achievement_id = achievement.id
  )
  and exists (
    select 1 from public.catalog_items item
    where item.id = achievement.item_id
      and not item.achievements_enabled
  )
  and not exists (
    select 1 from public.interactive_event_definitions definition
    where definition.achievement_id = achievement.id
  );

commit;

