-- Merge Beats and Sample Packs into one "Assets" bucket for browsing and
-- creation, purely additive: no existing row's experience_type changes, no
-- beat/sample-pack table is touched. See the iOS-side "Assets" merge plan
-- for the full rationale — Beats are already `experience_type='music'` plus
-- an `item_types(slug='beat')` assignment (membership computed entirely by
-- `is_beat_item`), and Sample Packs are already `experience_type='asset'`,
-- so both can be grouped under one "Assets" concept without moving data.
--
-- This migration:
--   1. Relabels the existing 'beat' item_type to "Instrumental" and adds a
--      new sibling "Vocal / Acapella" sub-type, both under the music
--      category (unchanged slug for 'beat' so every hardcoded lookup keeps
--      working).
--   2. Widens `is_beat_item` so Vocal/Acapella items get full beat-license
--      machinery (BPM/key fields, license tiers, private files, commerce
--      eligibility) automatically, the same way Instrumental already does.
--   3. Reissues `save_owned_beat_draft` with a new, defaulted
--      `target_asset_subtype` parameter so it can create either sub-type
--      instead of hardcoding 'beat'.
--   4. Renames the 'asset' category's display name back to "Assets".
--   5. Adds an 'assets' branch to `browse_catalog_v1` matching either kind,
--      alongside (not replacing) the existing 'beats'/'samples' branches.

-- ---------------------------------------------------------------------------
-- 1. Sub-type taxonomy: Instrumental (renamed Beat) + new Vocal / Acapella
-- ---------------------------------------------------------------------------

update public.item_types
set label='Instrumental', updated_at=now()
where category_id=(select id from public.item_categories where slug='music')
  and slug='beat';

insert into public.item_types(category_id,label,slug,sort_order,is_active)
select id,'Vocal / Acapella','vocal-acapella',95,true
from public.item_categories where slug='music'
on conflict(category_id,slug) do update
  set label=excluded.label,sort_order=excluded.sort_order,is_active=true,updated_at=now();

-- ---------------------------------------------------------------------------
-- 2. is_beat_item: Vocal/Acapella gets the same beat-license machinery
-- ---------------------------------------------------------------------------

create or replace function public.is_beat_item(target_item_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.catalog_items item
    join public.item_type_assignments assignment on assignment.item_id=item.id
    join public.item_types item_type on item_type.id=assignment.item_type_id
    join public.item_categories category on category.id=item_type.category_id
    where item.id=target_item_id and item.experience_type='music'
      and category.slug='music' and item_type.slug in ('beat','vocal-acapella')
  ) or exists(
    select 1 from public.item_capabilities capability
    where capability.item_id=target_item_id and capability.capability_key='beat_licensing' and capability.is_enabled
  );
$$;
revoke all on function public.is_beat_item(uuid) from public;
grant execute on function public.is_beat_item(uuid) to anon,authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 3. save_owned_beat_draft: parameterize the sub-type instead of
--    hardcoding 'beat'. Postgres lets a defaulted trailing parameter be
--    added via create-or-replace without breaking existing 18-arg callers.
-- ---------------------------------------------------------------------------

create or replace function public.save_owned_beat_draft(
  target_item_id uuid,
  target_title text,
  target_description text,
  target_cover_url text,
  target_release_date date,
  target_preview_url text,
  target_preview_duration integer,
  target_bpm integer,
  target_key_root text,
  target_key_mode text,
  target_key_not_applicable boolean,
  target_time_signature text,
  target_sample_status text,
  target_sample_disclosure text,
  target_external_url text,
  target_tag_ids uuid[],
  target_attribute_term_ids uuid[],
  target_private_files jsonb,
  target_tier_prices jsonb,
  target_asset_subtype text default 'beat'
)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid:=auth.uid(); result uuid:=target_item_id; music_category uuid; beat_type uuid; beat_label text; owner_name text;
  preview_id uuid; key text; path text; asset_kind text; v_file_kind text; v_asset_id uuid; v_beat_file_id uuid;
  tier text; tier_price integer; v_offer_id uuid; template_row public.beat_license_templates; required_kind text;
begin
  if active_user is null or not public.is_approved_publisher(active_user) then raise exception 'Approved creator access required.' using errcode='42501'; end if;
  if not public.beat_review_surfaces_enabled() then raise exception 'Beat review surfaces are disabled.' using errcode='55000'; end if;
  if target_asset_subtype not in ('beat','vocal-acapella') then
    raise exception 'Unsupported Beat/Vocal asset sub-type.' using errcode='22023';
  end if;
  if nullif(btrim(target_title),'') is null or nullif(btrim(target_cover_url),'') is null or target_cover_url !~ '^https://[^[:space:]]+$'
    or target_release_date is null or target_preview_url !~ '^https://[^[:space:]]+$' or target_bpm not between 40 and 240
    or jsonb_typeof(coalesce(target_private_files,'{}'))<>'object' or jsonb_typeof(coalesce(target_tier_prices,'{}'))<>'object' then
    raise exception 'Beat title, artwork, release date, tagged preview, BPM, files, or prices are invalid.' using errcode='22023';
  end if;
  select id into music_category from public.item_categories where slug='music';
  select id into beat_type from public.item_types where category_id=music_category and slug=target_asset_subtype and is_active;
  if beat_type is null then raise exception 'Asset sub-type is not configured.' using errcode='55000'; end if;
  select label into beat_label from public.item_types where id=beat_type;
  select coalesce(nullif(btrim(display_name),''),nullif(btrim(username),''),'Creator') into owner_name from public.profiles where id=active_user;
  if result is null then
    insert into public.catalog_items(author_id,item_category_id,slug,title,creator,item_type,short_description,long_description,price_cents,is_free,cover_url,status,year,release_date,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled,sort_order)
    values(active_user,music_category,coalesce(nullif(regexp_replace(lower(target_title),'[^a-z0-9]+','-','g'),''),'beat')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),btrim(target_title),owner_name,beat_label,nullif(left(btrim(target_description),220),''),nullif(btrim(target_description),''),0,false,btrim(target_cover_url),'draft',extract(year from target_release_date)::integer,target_release_date,'music','digital',true,false,(extract(epoch from clock_timestamp())*1000)::bigint)
    returning id into result;
  else
    if not public.can_manage_item(result) or not public.is_beat_item(result) then raise exception 'Beat not found or not owned.' using errcode='42501'; end if;
    update public.catalog_items set item_category_id=music_category,title=btrim(target_title),creator=owner_name,item_type=beat_label,short_description=nullif(left(btrim(target_description),220),''),long_description=nullif(btrim(target_description),''),cover_url=btrim(target_cover_url),year=extract(year from target_release_date)::integer,release_date=target_release_date,experience_type='music',fulfillment_type='digital',streaming_enabled=true,download_purchase_enabled=false,updated_at=now() where id=result;
  end if;
  insert into public.item_type_assignments(item_id,item_type_id) values(result,beat_type)
    on conflict(item_id) do update set item_type_id=excluded.item_type_id;
  delete from public.item_tag_assignments where item_id=result;
  insert into public.item_tag_assignments(item_id,item_tag_id)
    select result,tag.id from public.item_tags tag where tag.id=any(coalesce(target_tag_ids,'{}')) and tag.category_id=music_category and tag.is_active;

  select preview_track_id into preview_id from public.beat_details where item_id=result;
  if preview_id is null then
    insert into public.tracks(item_id,number,title,duration_seconds,audio_url) values(result,1,btrim(target_title),nullif(target_preview_duration,0),btrim(target_preview_url)) returning id into preview_id;
  else
    update public.tracks set number=1,title=btrim(target_title),duration_seconds=nullif(target_preview_duration,0),audio_url=btrim(target_preview_url),download_url=null where id=preview_id and item_id=result;
  end if;
  insert into public.beat_details(item_id,preview_track_id,bpm,key_root,key_mode,key_not_applicable,time_signature,sample_status,sample_disclosure)
  values(result,preview_id,target_bpm,case when target_key_not_applicable then null else target_key_root end,case when target_key_not_applicable then null else target_key_mode end,target_key_not_applicable,target_time_signature,target_sample_status,nullif(btrim(target_sample_disclosure),''))
  on conflict(item_id) do update set preview_track_id=excluded.preview_track_id,bpm=excluded.bpm,key_root=excluded.key_root,key_mode=excluded.key_mode,key_not_applicable=excluded.key_not_applicable,time_signature=excluded.time_signature,sample_status=excluded.sample_status,sample_disclosure=excluded.sample_disclosure,updated_at=now();
  delete from public.beat_attribute_assignments where item_id=result;
  insert into public.beat_attribute_assignments(item_id,term_id)
    select result,term.id from public.beat_attribute_terms term where term.id=any(coalesce(target_attribute_term_ids,'{}')) and term.is_active;

  delete from public.item_external_links where item_id=result and lower(platform)='youtube';
  if nullif(btrim(target_external_url),'') is not null then
    if target_external_url !~* '^https://(www\.)?(youtube\.com|youtu\.be)/' then raise exception 'External Beat link must be a YouTube URL.' using errcode='22023'; end if;
    insert into public.item_external_links(item_id,platform,label,url,sort_order) values(result,'youtube','YouTube',btrim(target_external_url),0);
  end if;

  foreach key in array array['untagged_mp3','untagged_wav','stems_zip'] loop
    path:=nullif(btrim(target_private_files->>key),'');
    v_file_kind:=key;
    asset_kind:=case key when 'untagged_mp3' then 'beat_mp3' when 'untagged_wav' then 'beat_wav' else 'beat_stems' end;
    select file.id,file.asset_id into v_beat_file_id,v_asset_id from public.beat_files file where file.item_id=result and file.file_kind=v_file_kind;
    if path is null then
      if v_beat_file_id is not null then
        delete from public.beat_offer_files mapped where mapped.beat_file_id=v_beat_file_id;
        delete from public.beat_files file where file.id=v_beat_file_id;
        delete from public.item_assets asset where asset.id=v_asset_id;
      end if;
    elsif path !~ ('/'||active_user::text||'/') then
      raise exception 'Private Beat file path is not owned by this creator.' using errcode='42501';
    elsif v_beat_file_id is null then
      insert into public.item_assets(item_id,asset_type,title,storage_path,is_downloadable,sort_order)
      values(result,asset_kind,case key when 'untagged_mp3' then 'Untagged MP3' when 'untagged_wav' then 'Untagged WAV' else 'Stems / Trackouts' end,path,true,case key when 'untagged_mp3' then 100 when 'untagged_wav' then 110 else 120 end) returning id into v_asset_id;
      insert into public.beat_files(item_id,asset_id,file_kind) values(result,v_asset_id,v_file_kind) returning id into v_beat_file_id;
    else
      update public.item_assets asset set storage_path=path,file_url=null,asset_type=asset_kind,is_downloadable=true where asset.id=v_asset_id;
    end if;
    v_beat_file_id:=null; v_asset_id:=null;
  end loop;

  foreach tier in array array['basic','premium','trackout','exclusive'] loop
    if target_tier_prices ? tier and jsonb_typeof(target_tier_prices->tier)='number' then tier_price:=(target_tier_prices->>tier)::integer; else tier_price:=null; end if;
    select offer.id into v_offer_id from public.catalog_offers offer where offer.item_id=result and offer.code='beat-'||tier;
    if tier_price is null then
      update public.catalog_offers offer set status='archived',updated_at=now() where offer.id=v_offer_id;
    else
      if tier_price<0 or tier_price>100000000 then raise exception 'Beat tier price is invalid.' using errcode='22023'; end if;
      select * into template_row from public.beat_license_templates where tier_code=tier and status='draft' order by version desc limit 1;
      if template_row.id is null then raise exception 'Draft Beat license template is missing.' using errcode='55000'; end if;
      if v_offer_id is null then
        insert into public.catalog_offers(item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type,quantity_limit)
        values(result,'beat-'||tier,'beat_license',template_row.title,template_row.short_summary,tier_price,'USD','draft','license',case when tier='exclusive' then 1 else null end) returning id into v_offer_id;
      else
        update public.catalog_offers offer set offer_type='beat_license',title=template_row.title,description=template_row.short_summary,price_cents=tier_price,currency='USD',status='draft',fulfillment_type='license',quantity_limit=case when tier='exclusive' then 1 else null end,updated_at=now() where offer.id=v_offer_id;
      end if;
      insert into public.beat_license_offers(offer_id,template_id) values(v_offer_id,template_row.id)
        on conflict(offer_id) do update set template_id=excluded.template_id;
      delete from public.beat_offer_files mapped where mapped.offer_id=v_offer_id;
      foreach required_kind in array template_row.included_file_kinds loop
        select file.id into v_beat_file_id from public.beat_files file where file.item_id=result and file.file_kind=required_kind;
        if v_beat_file_id is null then raise exception '% requires a % file.',template_row.title,required_kind using errcode='23514'; end if;
        insert into public.beat_offer_files(offer_id,beat_file_id) values(v_offer_id,v_beat_file_id);
      end loop;
    end if;
    v_offer_id:=null;
  end loop;
  if exists(select 1 from public.beat_configuration_health(result)) then raise exception 'Beat configuration is incomplete.' using errcode='23514'; end if;
  return result;
end;
$$;
revoke all on function public.save_owned_beat_draft(uuid,text,text,text,date,text,integer,integer,text,text,boolean,text,text,text,text,uuid[],uuid[],jsonb,jsonb,text) from public,anon;
grant execute on function public.save_owned_beat_draft(uuid,text,text,text,date,text,integer,integer,text,text,boolean,text,text,text,text,uuid[],uuid[],jsonb,jsonb,text) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 4. Rename the 'asset' category's display name back to "Assets"
-- ---------------------------------------------------------------------------

update public.item_categories set name='Assets' where slug='sample-packs';

-- ---------------------------------------------------------------------------
-- 5. browse_catalog_v1: add an 'assets' branch matching either kind,
--    alongside (not replacing) the existing 'beats'/'samples' branches.
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
        or (normalized_category='beats' and exists(
          select 1 from public.item_type_assignments assignment
          join public.item_types item_type on item_type.id=assignment.item_type_id
          where assignment.item_id=item.id and item_type.slug='beat'
        ))
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
