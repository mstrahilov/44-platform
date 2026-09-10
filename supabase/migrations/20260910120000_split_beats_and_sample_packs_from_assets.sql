-- Un-merges the "Assets" browsing/creation bucket back into two separate
-- top-level groups: Beats (Instrumental + Vocal/Acapella) and Sample Packs
-- (Sample Pack + Remix Pack). Purely additive/corrective at the data layer —
-- no item's experience_type, item_type, or category assignment changes.
-- The `'assets'` branch added by 20260908040000 is left in place (harmless,
-- unused once both clients stop requesting it) rather than removed, since
-- removing it is riskier than just not calling it.

-- ---------------------------------------------------------------------------
-- 1. The 'beats' branch of browse_catalog_v1 only ever matched slug='beat',
--    so it silently excluded Vocal/Acapella items since that sub-type was
--    introduced. Widen it to match `is_beat_item()` (both sub-types) so the
--    "Beats" tab shows both once it's split back out client-side.
-- ---------------------------------------------------------------------------

create or replace function public.browse_catalog_v1(
  category text default null,
  query text default null,
  sort text default 'release_date',
  type text default null,
  tag text default null,
  creator text default null,
  cursor jsonb default null,
  "limit" integer default 30
)
returns jsonb
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  bounded_limit integer := least(greatest(coalesce("limit",30),1),60);
  page_offset integer := least(greatest(coalesce((cursor->>'offset')::integer,0),0),10000);
  normalized_category text := lower(nullif(btrim(category),''));
  normalized_query text := nullif(btrim(query),'');
  normalized_sort text := coalesce(nullif(btrim(sort),''),'release_date');
  normalized_type text := lower(nullif(btrim(type),''));
  normalized_tag text := lower(nullif(btrim(tag),''));
  normalized_creator text := nullif(btrim(creator),'');
  result jsonb;
begin
  if normalized_query is not null and char_length(normalized_query)>100 then
    raise exception 'Browse query must be at most 100 characters.' using errcode='22023';
  end if;
  if normalized_sort not in ('release_date','recently_added','title') then
    raise exception 'Unsupported Browse sort.' using errcode='22023';
  end if;

  with filtered as (
    select item.id,item.release_date,item.created_at,item.title
    from public.catalog_items item
    left join public.item_categories item_category on item_category.id=item.item_category_id
    where item.status='published'
      and (normalized_category is null or normalized_category='all' or item_category.slug=normalized_category
        or item.experience_type=normalized_category
        or (normalized_category='physical' and item.fulfillment_type='physical')
        or (normalized_category='samples' and item.experience_type='asset')
        or (normalized_category='books' and item.experience_type='book')
        or (normalized_category='games' and item.experience_type='game')
        or (normalized_category='beats' and public.is_beat_item(item.id))
        or (normalized_category='assets' and (
          item.experience_type='asset'
          or exists(
            select 1 from public.item_type_assignments assignment
            join public.item_types item_type on item_type.id=assignment.item_type_id
            where assignment.item_id=item.id and item_type.slug in ('beat','vocal-acapella')
          )
        )))
      and (normalized_query is null or item.title ilike '%'||normalized_query||'%'
        or item.creator ilike '%'||normalized_query||'%'
        or coalesce(item.short_description,'') ilike '%'||normalized_query||'%')
      and (normalized_type is null or normalized_type='all' or exists(
        select 1 from public.item_type_assignments assignment
        join public.item_types item_type on item_type.id=assignment.item_type_id and item_type.is_active
        where assignment.item_id=item.id
          and (item_type.slug=normalized_type or lower(item_type.label)=normalized_type)
      ))
      and (normalized_tag is null or normalized_tag='all' or exists(
        select 1 from public.item_tag_assignments assignment
        join public.item_tags item_tag on item_tag.id=assignment.item_tag_id and item_tag.is_active
        where assignment.item_id=item.id
          and (item_tag.slug=normalized_tag or lower(item_tag.label)=normalized_tag)
      ))
      and (normalized_creator is null or lower(normalized_creator)='all'
        or (lower(normalized_creator)='following' and exists(
          select 1 from public.profile_follows follow
          where follow.follower_id=auth.uid() and follow.following_id=item.author_id
        ))
        or item.author_id::text=normalized_creator
        or lower(item.creator)=lower(normalized_creator))
  ),
  ordered as (
    select * from filtered
    order by
      case when normalized_sort='title' then lower(title) end asc,
      case when normalized_sort='recently_added' then created_at end desc,
      case when normalized_sort='release_date' then release_date end desc nulls last,
      created_at desc,id desc
    offset page_offset
    limit bounded_limit+1
  ),
  page as (select * from ordered limit bounded_limit)
  select jsonb_build_object(
    'contract_version',1,
    'items',coalesce((select jsonb_agg(public.catalog_item_public_payload_v1(id)) from page),'[]'::jsonb),
    'next_cursor',case when (select count(*) from ordered)>bounded_limit
      then jsonb_build_object('offset',page_offset+bounded_limit)
      else null end
  ) into result;
  return result;
exception when invalid_text_representation then
  raise exception 'Invalid Browse cursor.' using errcode='22023';
end;
$$;
revoke all on function public.browse_catalog_v1(text,text,text,text,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.browse_catalog_v1(text,text,text,text,text,text,jsonb,integer) to anon,authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 2. Revert the 'sample-packs' category's display name from "Assets" back
--    to "Sample Packs" now that it's browsed as its own bucket again.
-- ---------------------------------------------------------------------------

update public.item_categories set name='Sample Packs' where slug='sample-packs';

-- ---------------------------------------------------------------------------
-- 3. Free beat licenses. A license tier's price was already allowed to be 0
--    by `save_owned_beat_draft` (only `tier_price<0` is rejected), but every
--    downstream path assumed a real purchase: `create_stripe_pending_order`
--    hard-requires `price_cents>0`, so a $0 tier could never actually be
--    claimed by a fan. Rather than route $0 through Stripe, mirror the
--    existing `save_item_to_library` pattern (the free-Library-save path,
--    which never touches `commerce_orders` either) — grant the offer's
--    entitlements and a library entry directly, tagged `source_type
--    'free_offer'` exactly like that function already does.
-- ---------------------------------------------------------------------------

create or replace function public.claim_free_beat_license(target_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  active_user uuid := auth.uid();
  offer_row public.catalog_offers;
  item_row public.catalog_items;
  granted public.offer_entitlements;
  library_id uuid;
begin
  if active_user is null then raise exception 'authentication required'; end if;

  select offer.* into offer_row from public.catalog_offers offer
  where offer.id = target_offer_id and offer.offer_type = 'beat_license'
    and offer.status = 'active' and offer.price_cents = 0
    and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now());
  if offer_row.id is null then
    raise exception 'This license is not available to claim for free.' using errcode = '55000';
  end if;

  select * into item_row from public.catalog_items where id = offer_row.item_id and status = 'published';
  if item_row.id is null or not public.is_beat_item(item_row.id) then
    raise exception 'Beat not found.' using errcode = 'P0002';
  end if;
  if not public.is_creator_paid_sales_enabled(item_row.author_id)
     or not coalesce((select checkout_enabled and nonexclusive_pilot_enabled from public.beat_runtime_controls where singleton), false) then
    raise exception 'This creator or Beat is not enabled for licensing.' using errcode = '55000';
  end if;

  for granted in select * from public.offer_entitlements where offer_id = target_offer_id loop
    insert into public.entitlements(user_id, item_id, entitlement_type, status, source_type, source_id, granted_at, revoked_at)
    values(active_user, item_row.id, granted.entitlement_type, 'active', 'free_offer', offer_row.id, now(), null)
    on conflict(user_id, item_id, entitlement_type) do update
      set status = 'active', source_type = 'free_offer', source_id = offer_row.id, revoked_at = null, expires_at = null,
        granted_at = case when public.entitlements.status = 'active' then public.entitlements.granted_at else now() end;

    insert into public.entitlement_events(entitlement_id, user_id, item_id, entitlement_type, operation, source_type, source_id, actor_id, reason)
    select id, active_user, item_row.id, granted.entitlement_type, 'grant', 'free_offer', offer_row.id, active_user, 'Free beat license claim'
    from public.entitlements where user_id = active_user and item_id = item_row.id and entitlement_type = granted.entitlement_type;
  end loop;

  insert into public.library_entries(user_id, item_id, acquisition_type, status, acquired_at)
  values(active_user, item_row.id, 'free', 'visible', now())
  on conflict(user_id, item_id) do update
    set status = 'visible',
      acquisition_type = case when public.library_entries.acquisition_type in ('paid', 'purchase', 'grant')
        then public.library_entries.acquisition_type else 'free' end
  returning id into library_id;

  return library_id;
end;
$$;

revoke all on function public.claim_free_beat_license(uuid) from public, anon;
grant execute on function public.claim_free_beat_license(uuid) to authenticated;
