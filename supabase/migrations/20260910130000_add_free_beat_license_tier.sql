-- Adds a fifth Beat license tier, "Free" — alongside Basic/Premium/Trackout/
-- Exclusive, not replacing the existing $0-on-any-tier path. A creator who
-- wants to give a Beat away can now say so explicitly instead of relying on
-- a fan noticing an empty-looking $0 price field.
--
-- Like every other tier when it was first introduced (see
-- 20260715010000_m18_beat_store_foundation.sql), this template starts in
-- 'draft' status with placeholder terms text — it is usable for testing and
-- Studio configuration immediately, but is NOT counsel-approved for real
-- release. Activating it (real terms text, `platform_approved_at`,
-- `approved_by`) is a legal/business decision for a follow-up migration,
-- the same two-step process `basic`/`premium`/`trackout` went through in
-- 20260807010000_v12_activate_standard_beat_sales.sql — this migration does
-- not perform that step.

alter table public.beat_license_templates
  drop constraint beat_license_templates_tier_code_check,
  add constraint beat_license_templates_tier_code_check
    check (tier_code in ('basic', 'premium', 'trackout', 'exclusive', 'free'));

alter table public.beat_license_templates
  drop constraint beat_license_template_files_check,
  add constraint beat_license_template_files_check check(
    (tier_code='basic' and included_file_kinds=array['untagged_mp3']::text[] and not is_exclusive)
    or (tier_code='premium' and included_file_kinds=array['untagged_mp3','untagged_wav']::text[] and not is_exclusive)
    or (tier_code='trackout' and included_file_kinds=array['untagged_mp3','untagged_wav','stems_zip']::text[] and not is_exclusive)
    or (tier_code='exclusive' and included_file_kinds=array['untagged_mp3','untagged_wav','stems_zip']::text[] and is_exclusive)
    or (tier_code='free' and included_file_kinds=array['untagged_mp3']::text[] and not is_exclusive)
  );

insert into public.beat_license_templates(tier_code,version,title,short_summary,included_file_kinds,is_exclusive,terms_text) values
 ('free',1,'Free License','Non-exclusive license with an untagged MP3, at no cost.',array['untagged_mp3'],false,'DRAFT — NOT APPROVED FOR SALE. Standard Free Beat license terms require review and approval by counsel before activation.')
on conflict(tier_code,version) do nothing;

-- save_owned_beat_draft: widen the tier loop to include 'free', and force
-- its price to 0 regardless of what the client sends — it is inherently
-- free, not just a tier a creator happened to price at zero.
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

  foreach tier in array array['basic','premium','trackout','exclusive','free'] loop
    if target_tier_prices ? tier and jsonb_typeof(target_tier_prices->tier)='number' then tier_price:=(target_tier_prices->>tier)::integer; else tier_price:=null; end if;
    if tier='free' and tier_price is not null then tier_price:=0; end if;
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
