-- M18: hidden Beat Store foundation.
--
-- Beats remain canonical Music Items. This migration deliberately leaves every
-- public and commercial switch disabled. Protected sale files are authorized
-- from immutable buyer license grants, never from a generic Item entitlement.

-- ---------------------------------------------------------------------------
-- Taxonomy and capability contracts
-- ---------------------------------------------------------------------------

insert into public.item_categories(slug,name,sort_order)
values('music','Music',10)
on conflict(slug) do update set name=excluded.name;

insert into public.item_types(category_id,label,slug,sort_order,is_active)
select id,'Beat','beat',90,true from public.item_categories where slug='music'
on conflict(category_id,slug) do update set label=excluded.label,sort_order=excluded.sort_order,is_active=true,updated_at=now();

alter table public.item_capabilities drop constraint if exists item_capabilities_key_check;
alter table public.item_capabilities add constraint item_capabilities_key_check check (
  capability_key = any(array['streaming','downloads','achievements','bonus_content','reviews','creator_updates','reader','sample_preview','commentary','behind_the_scenes','events','video','webgl','beat_licensing']::text[])
);

alter table public.item_assets drop constraint if exists item_assets_asset_type_check;
alter table public.item_assets add constraint item_assets_asset_type_check check (
  asset_type = any(array[
    'audio','book','book_preview','sample_pack','sample','sample_preview','gallery_image',
    'bonus_content','bonus_achievement','commentary_audio','behind_the_scenes','image',
    'webgl','template','music','merch','beat_mp3','beat_wav','beat_stems','other'
  ]::text[])
);

alter table public.catalog_offers drop constraint if exists catalog_offers_offer_type_check;
alter table public.catalog_offers add constraint catalog_offers_offer_type_check check (
  offer_type in ('library_access','digital_download','physical_purchase','support','beat_license')
);
alter table public.catalog_offers drop constraint if exists catalog_offers_fulfillment_type_check;
alter table public.catalog_offers add constraint catalog_offers_fulfillment_type_check check (
  fulfillment_type in ('entitlement','physical','none','license')
);

create or replace function public.is_beat_item(target_item_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.catalog_items item
    join public.item_type_assignments assignment on assignment.item_id=item.id
    join public.item_types item_type on item_type.id=assignment.item_type_id
    join public.item_categories category on category.id=item_type.category_id
    where item.id=target_item_id and item.experience_type='music'
      and category.slug='music' and item_type.slug='beat'
  ) or exists(
    select 1 from public.item_capabilities capability
    where capability.item_id=target_item_id and capability.capability_key='beat_licensing' and capability.is_enabled
  );
$$;
revoke all on function public.is_beat_item(uuid) from public;
grant execute on function public.is_beat_item(uuid) to anon,authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Fail-closed runtime controls and Beat metadata
-- ---------------------------------------------------------------------------

create table public.beat_runtime_controls (
  singleton boolean primary key default true check(singleton),
  review_surfaces_enabled boolean not null default false,
  catalog_enabled boolean not null default false,
  publishing_enabled boolean not null default false,
  checkout_enabled boolean not null default false,
  nonexclusive_pilot_enabled boolean not null default false,
  split_sales_enabled boolean not null default false,
  exclusive_sales_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint beat_runtime_controls_fail_closed check(
    (not publishing_enabled or catalog_enabled)
    and (not checkout_enabled or (catalog_enabled and publishing_enabled))
    and (not nonexclusive_pilot_enabled or checkout_enabled)
    and (not split_sales_enabled or nonexclusive_pilot_enabled)
    and (not exclusive_sales_enabled or checkout_enabled)
  )
);
insert into public.beat_runtime_controls(singleton) values(true);
create trigger beat_runtime_controls_touch_updated_at before update on public.beat_runtime_controls
for each row execute function public.touch_content_updated_at();

create table public.beat_details (
  item_id uuid primary key references public.catalog_items(id) on delete cascade,
  preview_track_id uuid not null unique references public.tracks(id) on delete restrict,
  bpm integer not null check(bpm between 40 and 240),
  key_root text check(key_root is null or key_root in ('C','C#','D','D#','E','F','F#','G','G#','A','A#','B')),
  key_mode text check(key_mode is null or key_mode in ('major','minor')),
  key_not_applicable boolean not null default false,
  time_signature text not null default '4/4' check(time_signature in ('2/4','3/4','4/4','5/4','6/8','7/8','12/8')),
  sample_status text not null default 'none' check(sample_status in ('none','royalty_free','separately_cleared')),
  sample_disclosure text,
  sale_status text not null default 'available' check(sale_status in ('available','reserved','sold')),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beat_details_key_check check(
    (key_not_applicable and key_root is null and key_mode is null)
    or (not key_not_applicable and key_root is not null and key_mode is not null)
  ),
  constraint beat_details_sample_disclosure_check check(
    sample_status='none' or char_length(btrim(coalesce(sample_disclosure,''))) between 1 and 2000
  ),
  constraint beat_details_sold_check check((sale_status='sold' and sold_at is not null) or (sale_status<>'sold' and sold_at is null))
);
create trigger beat_details_touch_updated_at before update on public.beat_details
for each row execute function public.touch_content_updated_at();

create table public.beat_attribute_terms (
  id uuid primary key default gen_random_uuid(),
  attribute_kind text not null check(attribute_kind in ('mood','instrument')),
  label text not null check(char_length(btrim(label)) between 1 and 80),
  slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attribute_kind,slug)
);
create table public.beat_attribute_assignments (
  item_id uuid not null references public.beat_details(item_id) on delete cascade,
  term_id uuid not null references public.beat_attribute_terms(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(item_id,term_id)
);
create index beat_attribute_assignments_term_idx on public.beat_attribute_assignments(term_id,item_id);

insert into public.beat_attribute_terms(attribute_kind,label,slug,sort_order) values
  ('mood','Aggressive','aggressive',10),('mood','Chill','chill',20),('mood','Dark','dark',30),
  ('mood','Emotional','emotional',40),('mood','Energetic','energetic',50),('mood','Happy','happy',60),
  ('mood','Melodic','melodic',70),('mood','Soulful','soulful',80),
  ('instrument','Bass','bass',10),('instrument','Drums','drums',20),('instrument','Guitar','guitar',30),
  ('instrument','Piano','piano',40),('instrument','Strings','strings',50),('instrument','Synth','synth',60),
  ('instrument','Vocal','vocal',70),('instrument','Woodwind','woodwind',80)
on conflict(attribute_kind,slug) do update set label=excluded.label,sort_order=excluded.sort_order,is_active=true,updated_at=now();

create table public.beat_files (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.beat_details(item_id) on delete cascade,
  asset_id uuid not null unique references public.item_assets(id) on delete restrict,
  file_kind text not null check(file_kind in ('untagged_mp3','untagged_wav','stems_zip')),
  created_at timestamptz not null default now(),
  unique(item_id,file_kind)
);

create or replace function public.validate_beat_child()
returns trigger language plpgsql set search_path=public as $$
declare item_kind text; preview_item uuid; asset_row public.item_assets; term_kind text;
begin
  if tg_table_name='beat_details' then
    select experience_type into item_kind from public.catalog_items where id=new.item_id;
    select item_id into preview_item from public.tracks where id=new.preview_track_id;
    if item_kind<>'music' or preview_item is distinct from new.item_id then
      raise exception 'Beat metadata requires a Music Item and its own preview track.' using errcode='23514';
    end if;
  elsif tg_table_name='beat_files' then
    select * into asset_row from public.item_assets where id=new.asset_id;
    if asset_row.id is null or asset_row.item_id<>new.item_id or asset_row.storage_path is null
      or asset_row.file_url is not null or not asset_row.is_downloadable
      or asset_row.asset_type<>(case new.file_kind when 'untagged_mp3' then 'beat_mp3' when 'untagged_wav' then 'beat_wav' else 'beat_stems' end) then
      raise exception 'Beat sale files must map to the matching private Item asset.' using errcode='23514';
    end if;
  elsif tg_table_name='beat_attribute_assignments' then
    select attribute_kind into term_kind from public.beat_attribute_terms where id=new.term_id and is_active;
    if term_kind is null then raise exception 'Beat attributes must use an active controlled term.' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
create trigger beat_details_validate before insert or update on public.beat_details for each row execute function public.validate_beat_child();
create trigger beat_files_validate before insert or update on public.beat_files for each row execute function public.validate_beat_child();
create trigger beat_attribute_assignments_validate before insert or update on public.beat_attribute_assignments for each row execute function public.validate_beat_child();

create or replace function public.sync_beat_capability()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_item uuid:=coalesce(new.item_id,old.item_id);
begin
  insert into public.item_capabilities(item_id,capability_key,is_enabled)
  values(target_item,'beat_licensing',exists(select 1 from public.beat_details where item_id=target_item))
  on conflict(item_id,capability_key) do update set is_enabled=excluded.is_enabled,updated_at=now();
  return coalesce(new,old);
end;
$$;
create trigger beat_details_sync_capability after insert or update or delete on public.beat_details
for each row execute function public.sync_beat_capability();

-- ---------------------------------------------------------------------------
-- Versioned standard licenses, offers, files, collaborators, and grants
-- ---------------------------------------------------------------------------

create table public.beat_license_templates (
  id uuid primary key default gen_random_uuid(),
  tier_code text not null check(tier_code in ('basic','premium','trackout','exclusive')),
  version integer not null check(version>0),
  title text not null,
  short_summary text not null,
  included_file_kinds text[] not null,
  is_exclusive boolean not null,
  terms_text text not null,
  terms_sha256 text generated always as (encode(extensions.digest(terms_text,'sha256'),'hex')) stored,
  status text not null default 'draft' check(status in ('draft','active','retired')),
  counsel_approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tier_code,version),
  constraint beat_license_template_files_check check(
    (tier_code='basic' and included_file_kinds=array['untagged_mp3']::text[] and not is_exclusive)
    or (tier_code='premium' and included_file_kinds=array['untagged_mp3','untagged_wav']::text[] and not is_exclusive)
    or (tier_code='trackout' and included_file_kinds=array['untagged_mp3','untagged_wav','stems_zip']::text[] and not is_exclusive)
    or (tier_code='exclusive' and included_file_kinds=array['untagged_mp3','untagged_wav','stems_zip']::text[] and is_exclusive)
  ),
  constraint beat_license_template_activation_check check(
    status<>'active' or (counsel_approved_at is not null and approved_by is not null and char_length(terms_text)>=500)
  )
);

insert into public.beat_license_templates(tier_code,version,title,short_summary,included_file_kinds,is_exclusive,terms_text) values
 ('basic',1,'Basic License','Non-exclusive license with an untagged MP3.',array['untagged_mp3'],false,'DRAFT — NOT APPROVED FOR SALE. Standard Basic Beat license terms require review and approval by counsel before activation.'),
 ('premium',1,'Premium License','Non-exclusive license with untagged MP3 and WAV files.',array['untagged_mp3','untagged_wav'],false,'DRAFT — NOT APPROVED FOR SALE. Standard Premium Beat license terms require review and approval by counsel before activation.'),
 ('trackout',1,'Trackout License','Non-exclusive license with MP3, WAV, and stems.',array['untagged_mp3','untagged_wav','stems_zip'],false,'DRAFT — NOT APPROVED FOR SALE. Standard Trackout Beat license terms require review and approval by counsel before activation.'),
 ('exclusive',1,'Exclusive License','One exclusive sale with MP3, WAV, and stems.',array['untagged_mp3','untagged_wav','stems_zip'],true,'DRAFT — NOT APPROVED FOR SALE. Standard Exclusive Beat license terms require review and approval by counsel before activation.')
on conflict(tier_code,version) do nothing;

create table public.beat_license_offers (
  offer_id uuid primary key references public.catalog_offers(id) on delete cascade,
  template_id uuid not null references public.beat_license_templates(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.beat_offer_files (
  offer_id uuid not null references public.beat_license_offers(offer_id) on delete cascade,
  beat_file_id uuid not null references public.beat_files(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(offer_id,beat_file_id)
);

create table public.beat_collaborator_splits (
  item_id uuid not null references public.beat_details(item_id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  revenue_share_bps integer not null check(revenue_share_bps between 0 and 10000),
  publishing_share_bps integer not null check(publishing_share_bps between 0 and 10000),
  acceptance_status text not null default 'pending' check(acceptance_status in ('pending','accepted','revoked')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(item_id,profile_id),
  constraint beat_split_acceptance_check check((acceptance_status='accepted' and accepted_at is not null) or (acceptance_status<>'accepted' and accepted_at is null))
);
create trigger beat_collaborator_splits_touch_updated_at before update on public.beat_collaborator_splits
for each row execute function public.touch_content_updated_at();

create or replace function public.seed_beat_owner_split()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.catalog_items where id=new.item_id;
  insert into public.beat_collaborator_splits(item_id,profile_id,revenue_share_bps,publishing_share_bps,acceptance_status,accepted_at)
  values(new.item_id,owner_id,10000,10000,'accepted',now()) on conflict(item_id,profile_id) do nothing;
  return new;
end;
$$;
create trigger beat_details_seed_owner_split after insert on public.beat_details
for each row execute function public.seed_beat_owner_split();

create or replace function public.validate_beat_commerce_child()
returns trigger language plpgsql set search_path=public as $$
declare offer_row public.catalog_offers; template_row public.beat_license_templates; file_row public.beat_files;
begin
  if tg_table_name='beat_license_offers' then
    select * into offer_row from public.catalog_offers where id=new.offer_id;
    select * into template_row from public.beat_license_templates where id=new.template_id;
    if offer_row.offer_type<>'beat_license' or offer_row.fulfillment_type<>'license' or not public.is_beat_item(offer_row.item_id) then
      raise exception 'Beat license mappings require a Beat license offer.' using errcode='23514';
    end if;
    if template_row.id is null then raise exception 'Beat license template not found.' using errcode='23514'; end if;
  elsif tg_table_name='beat_offer_files' then
    select offer.* into offer_row from public.catalog_offers offer join public.beat_license_offers mapped on mapped.offer_id=offer.id where offer.id=new.offer_id;
    select * into file_row from public.beat_files where id=new.beat_file_id;
    if offer_row.id is null or file_row.id is null or offer_row.item_id<>file_row.item_id then
      raise exception 'Offer files must belong to the same Beat.' using errcode='23514';
    end if;
  elsif tg_table_name='beat_collaborator_splits' then
    if not exists(select 1 from public.item_members where item_id=new.item_id and profile_id=new.profile_id)
      and not exists(select 1 from public.catalog_items where id=new.item_id and author_id=new.profile_id) then
      raise exception 'Beat split recipients must be Item collaborators.' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger beat_license_offers_validate before insert or update on public.beat_license_offers for each row execute function public.validate_beat_commerce_child();
create trigger beat_offer_files_validate before insert or update on public.beat_offer_files for each row execute function public.validate_beat_commerce_child();
create trigger beat_collaborator_splits_validate before insert or update on public.beat_collaborator_splits for each row execute function public.validate_beat_commerce_child();

create table public.beat_license_grants (
  id uuid primary key default gen_random_uuid(),
  license_number text not null unique,
  order_item_id uuid not null unique references public.commerce_order_items(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  template_id uuid not null references public.beat_license_templates(id) on delete restrict,
  tier_code text not null check(tier_code in ('basic','premium','trackout','exclusive')),
  is_exclusive boolean not null,
  status text not null default 'active' check(status in ('active','revoked','refunded','disputed')),
  terms_text text not null,
  terms_sha256 text not null check(terms_sha256 ~ '^[0-9a-f]{64}$'),
  price_cents integer not null check(price_cents>=0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  seller_snapshot jsonb not null,
  collaborator_snapshot jsonb not null,
  file_manifest jsonb not null check(jsonb_typeof(file_manifest)='array'),
  granted_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index beat_license_grants_buyer_idx on public.beat_license_grants(buyer_id,granted_at desc);
create index beat_license_grants_item_idx on public.beat_license_grants(item_id,status);
create unique index beat_license_grants_one_exclusive on public.beat_license_grants(item_id) where is_exclusive;

create table public.beat_license_download_events (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.beat_license_grants(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  beat_file_id uuid not null references public.beat_files(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);
create index beat_license_download_events_grant_idx on public.beat_license_download_events(grant_id,occurred_at desc);

create table public.beat_exclusive_reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.beat_details(item_id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid references public.commerce_orders(id) on delete restrict,
  idempotency_key text not null unique,
  status text not null default 'active' check(status in ('active','released','expired','consumed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check(expires_at>created_at)
);
create unique index beat_exclusive_reservations_one_active on public.beat_exclusive_reservations(item_id) where status='active';

create or replace function public.reject_beat_contract_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='beat_license_templates' and old.status='draft' and coalesce(current_setting('os44.beat_service_write',true),'')<>'1' then return new; end if;
  if tg_table_name='beat_license_grants' and tg_op='UPDATE'
    and coalesce(current_setting('os44.beat_service_write',true),'')='1'
    and new.id=old.id and new.license_number=old.license_number and new.order_item_id=old.order_item_id
    and new.buyer_id=old.buyer_id and new.item_id=old.item_id and new.offer_id=old.offer_id
    and new.template_id=old.template_id and new.tier_code=old.tier_code and new.is_exclusive=old.is_exclusive
    and new.terms_text=old.terms_text and new.terms_sha256=old.terms_sha256 and new.price_cents=old.price_cents
    and new.currency=old.currency and new.seller_id=old.seller_id and new.seller_snapshot=old.seller_snapshot
    and new.collaborator_snapshot=old.collaborator_snapshot and new.file_manifest=old.file_manifest
    and new.granted_at=old.granted_at and new.created_at=old.created_at then return new;
  end if;
  raise exception '% contract history is immutable.',tg_table_name using errcode='55000';
end;
$$;
create trigger beat_license_templates_protect before update or delete on public.beat_license_templates for each row execute function public.reject_beat_contract_mutation();
create trigger beat_license_grants_protect before update or delete on public.beat_license_grants for each row execute function public.reject_beat_contract_mutation();
create trigger beat_download_events_immutable before update or delete on public.beat_license_download_events for each row execute function public.reject_beat_contract_mutation();

-- ---------------------------------------------------------------------------
-- Publication and offer completeness
-- ---------------------------------------------------------------------------

create or replace function public.beat_configuration_health(target_item_id uuid)
returns table(code text,message text) language sql stable security definer set search_path=public as $$
  with details as (select * from public.beat_details where item_id=target_item_id),
  split_totals as (
    select coalesce(sum(revenue_share_bps),0) revenue_total,coalesce(sum(publishing_share_bps),0) publishing_total,
      count(*) filter(where acceptance_status<>'accepted') pending_count
    from public.beat_collaborator_splits where item_id=target_item_id
  ), offers as (
    select offer.id,template.included_file_kinds
    from public.catalog_offers offer
    join public.beat_license_offers mapping on mapping.offer_id=offer.id
    join public.beat_license_templates template on template.id=mapping.template_id
    where offer.item_id=target_item_id and offer.status in ('draft','active')
  )
  select 'missing_beat_details','Add BPM, musical key, sample disclosure, and a tagged preview.' where public.is_beat_item(target_item_id) and not exists(select 1 from details)
  union all select 'missing_tagged_preview','Add one creator-supplied tagged MP3 preview.' from details d where not exists(
    select 1 from public.tracks track where track.id=d.preview_track_id and track.item_id=target_item_id and nullif(btrim(track.audio_url),'') is not null
  )
  union all select 'invalid_split_total','Revenue and publishing allocations must each total 10,000 basis points.' from split_totals where revenue_total<>10000 or publishing_total<>10000
  union all select 'unaccepted_split','Every collaborator must accept before commerce activation.' from split_totals where pending_count>0
  union all select 'offer_missing_required_file','Every enabled tier must include each file required by its template.' from offers offer where exists(
    select 1 from unnest(offer.included_file_kinds) required(kind)
    where not exists(
      select 1 from public.beat_offer_files mapped join public.beat_files file on file.id=mapped.beat_file_id
      where mapped.offer_id=offer.id and file.item_id=target_item_id and file.file_kind=required.kind
    )
  );
$$;
revoke all on function public.beat_configuration_health(uuid) from public;
grant execute on function public.beat_configuration_health(uuid) to authenticated,service_role;

create or replace function public.beat_review_surfaces_enabled()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select review_surfaces_enabled from public.beat_runtime_controls where singleton),false);
$$;
revoke all on function public.beat_review_surfaces_enabled() from public,anon;
grant execute on function public.beat_review_surfaces_enabled() to authenticated,service_role;

create or replace function public.beat_catalog_enabled()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select catalog_enabled from public.beat_runtime_controls where singleton),false);
$$;
revoke all on function public.beat_catalog_enabled() from public;
grant execute on function public.beat_catalog_enabled() to anon,authenticated,service_role;

-- One transaction materializes a complete draft after storage uploads succeed.
-- Commerce offers remain drafts and use the latest draft standard template.
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
  target_tier_prices jsonb
)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid:=auth.uid(); result uuid:=target_item_id; music_category uuid; beat_type uuid; owner_name text;
  preview_id uuid; key text; path text; asset_kind text; v_file_kind text; v_asset_id uuid; v_beat_file_id uuid;
  tier text; tier_price integer; v_offer_id uuid; template_row public.beat_license_templates; required_kind text;
begin
  if active_user is null or not public.is_approved_publisher(active_user) then raise exception 'Approved creator access required.' using errcode='42501'; end if;
  if not public.beat_review_surfaces_enabled() then raise exception 'Beat review surfaces are disabled.' using errcode='55000'; end if;
  if nullif(btrim(target_title),'') is null or nullif(btrim(target_cover_url),'') is null or target_cover_url !~ '^https://[^[:space:]]+$'
    or target_release_date is null or target_preview_url !~ '^https://[^[:space:]]+$' or target_bpm not between 40 and 240
    or jsonb_typeof(coalesce(target_private_files,'{}'))<>'object' or jsonb_typeof(coalesce(target_tier_prices,'{}'))<>'object' then
    raise exception 'Beat title, artwork, release date, tagged preview, BPM, files, or prices are invalid.' using errcode='22023';
  end if;
  select id into music_category from public.item_categories where slug='music';
  select id into beat_type from public.item_types where category_id=music_category and slug='beat' and is_active;
  select coalesce(nullif(btrim(display_name),''),nullif(btrim(username),''),'Creator') into owner_name from public.profiles where id=active_user;
  if result is null then
    insert into public.catalog_items(author_id,item_category_id,slug,title,creator,item_type,short_description,long_description,price_cents,is_free,cover_url,status,year,release_date,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled,sort_order)
    values(active_user,music_category,coalesce(nullif(regexp_replace(lower(target_title),'[^a-z0-9]+','-','g'),''),'beat')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),btrim(target_title),owner_name,'Beat',nullif(left(btrim(target_description),220),''),nullif(btrim(target_description),''),0,false,btrim(target_cover_url),'draft',extract(year from target_release_date)::integer,target_release_date,'music','digital',true,false,(extract(epoch from clock_timestamp())*1000)::bigint)
    returning id into result;
  else
    if not public.can_manage_item(result) or not public.is_beat_item(result) then raise exception 'Beat not found or not owned.' using errcode='42501'; end if;
    update public.catalog_items set item_category_id=music_category,title=btrim(target_title),creator=owner_name,item_type='Beat',short_description=nullif(left(btrim(target_description),220),''),long_description=nullif(btrim(target_description),''),cover_url=btrim(target_cover_url),year=extract(year from target_release_date)::integer,release_date=target_release_date,experience_type='music',fulfillment_type='digital',streaming_enabled=true,download_purchase_enabled=false,updated_at=now() where id=result;
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
revoke all on function public.save_owned_beat_draft(uuid,text,text,text,date,text,integer,integer,text,text,boolean,text,text,text,text,uuid[],uuid[],jsonb,jsonb) from public,anon;
grant execute on function public.save_owned_beat_draft(uuid,text,text,text,date,text,integer,integer,text,text,boolean,text,text,text,text,uuid[],uuid[],jsonb,jsonb) to authenticated,service_role;

create or replace function public.catalog_item_health(target_item_id uuid)
returns table(code text,message text) language sql stable security definer set search_path=public as $$
  with item as (select * from public.catalog_items where id=target_item_id)
  select 'missing_title','Add an Item title.' from item where nullif(btrim(title),'') is null
  union all select 'missing_creator','Add a creator name.' from item where nullif(btrim(creator),'') is null
  union all select 'missing_category','Choose a Category.' from item where item_category_id is null
  union all select 'missing_type','Choose an approved Item Type.' from item where not exists(
    select 1 from public.item_type_assignments a join public.item_types t on t.id=a.item_type_id where a.item_id=target_item_id and t.is_active and t.category_id=item.item_category_id
  )
  union all select 'missing_artwork','Upload catalog artwork.' from item where nullif(btrim(cover_url),'') is null
  union all select 'invalid_year','Use a release year between 1000 and next year.' from item where year is not null and(year<1000 or year>extract(year from now())::integer+1)
  union all select 'missing_music_tracks','Music needs at least one complete audio track.' from item where experience_type='music' and not exists(
    select 1 from public.tracks where item_id=target_item_id and nullif(btrim(title),'') is not null and nullif(btrim(audio_url),'') is not null
  )
  union all select 'incomplete_music_track','Every music track needs a title and audio file.' from item where experience_type='music' and exists(
    select 1 from public.tracks where item_id=target_item_id and(nullif(btrim(title),'') is null or nullif(btrim(audio_url),'') is null)
  )
  union all select 'missing_book_file','Books need an uploaded book file.' from item where experience_type='book' and not exists(
    select 1 from public.item_assets where item_id=target_item_id and asset_type='book' and coalesce(nullif(btrim(storage_path),''),nullif(btrim(file_url),'')) is not null
  )
  union all select 'missing_asset_file','Sample Packs need an uploaded downloadable ZIP.' from item where experience_type='asset' and not exists(
    select 1 from public.item_assets where item_id=target_item_id and asset_type in ('sample_pack','music','template','other') and is_downloadable and coalesce(nullif(btrim(storage_path),''),nullif(btrim(file_url),'')) is not null
  )
  union all select health.code,health.message from public.beat_configuration_health(target_item_id) health where public.is_beat_item(target_item_id);
$$;
revoke all on function public.catalog_item_health(uuid) from public;
grant execute on function public.catalog_item_health(uuid) to authenticated,service_role;

create or replace function public.enforce_beat_publication_gate()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='published' and public.is_beat_item(new.id) then
    if not coalesce((select publishing_enabled from public.beat_runtime_controls where singleton),false) then
      raise exception 'Beat publishing is disabled.' using errcode='55000';
    end if;
    if exists(select 1 from public.beat_configuration_health(new.id)) then
      raise exception 'Beat configuration is incomplete.' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger catalog_items_beat_publication_gate before insert or update of status on public.catalog_items
for each row execute function public.enforce_beat_publication_gate();

-- ---------------------------------------------------------------------------
-- Tier-aware private-file authorization and buyer manifests
-- ---------------------------------------------------------------------------

create or replace function public.has_active_beat_file_grant(target_user_id uuid,target_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.beat_license_grants grant_row
    join public.beat_offer_files offer_file on offer_file.offer_id=grant_row.offer_id
    join public.beat_files beat_file on beat_file.id=offer_file.beat_file_id
    where grant_row.buyer_id=target_user_id and grant_row.status='active' and beat_file.asset_id=target_asset_id
      and exists(select 1 from jsonb_array_elements(grant_row.file_manifest) manifest where (manifest->>'beatFileId')::uuid=beat_file.id)
  );
$$;
revoke all on function public.has_active_beat_file_grant(uuid,uuid) from public;
grant execute on function public.has_active_beat_file_grant(uuid,uuid) to authenticated,service_role;

create or replace function public.can_access_item_file(object_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.item_assets asset where asset.storage_path=object_name and(
      public.can_manage_item(asset.item_id)
      or (asset.asset_type in ('beat_mp3','beat_wav','beat_stems') and public.has_active_beat_file_grant(auth.uid(),asset.id))
      or (asset.asset_type in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content'))
      or (asset.asset_type='book' and public.has_item_entitlement(auth.uid(),asset.item_id,'read'))
      or (asset.asset_type in ('sample_pack','sample') and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (asset.asset_type not in ('beat_mp3','beat_wav','beat_stems') and asset.is_downloadable and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (asset.asset_type not in ('beat_mp3','beat_wav','beat_stems') and not asset.is_downloadable and asset.asset_type not in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
    )
  );
$$;

create or replace function public.list_item_asset_manifest(target_item_id uuid)
returns table(id uuid,item_id uuid,asset_type text,title text,file_url text,storage_path text,is_downloadable boolean,sort_order integer,created_at timestamptz,is_unlocked boolean)
language sql stable security definer set search_path=public as $$
  select asset.id,asset.item_id,asset.asset_type,asset.title,
    case when access.can_access then asset.file_url else null end,
    case when access.can_access then asset.storage_path else null end,
    asset.is_downloadable,asset.sort_order,asset.created_at,access.can_access
  from public.item_assets asset
  cross join lateral(select case
    when public.can_manage_item(asset.item_id) then true
    when asset.asset_type in ('beat_mp3','beat_wav','beat_stems') then public.has_active_beat_file_grant(auth.uid(),asset.id)
    when asset.asset_type in ('bonus_content','bonus_achievement') then public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content')
    when asset.asset_type='book' then public.has_item_entitlement(auth.uid(),asset.item_id,'read')
    when asset.asset_type in ('sample_pack','sample') then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
    when asset.is_downloadable then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
    else public.has_item_entitlement(auth.uid(),asset.item_id,'library_access') end can_access) access
  where asset.item_id=target_item_id and(
    public.can_manage_item(asset.item_id)
    or (asset.asset_type in ('beat_mp3','beat_wav','beat_stems') and access.can_access)
    or (asset.asset_type not in ('beat_mp3','beat_wav','beat_stems') and public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
  ) order by asset.sort_order,asset.created_at;
$$;

create or replace function public.record_beat_file_download(target_grant_id uuid,target_beat_file_id uuid,target_ip_hash text default null,target_user_agent text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  if not exists(
    select 1 from public.beat_license_grants grant_row
    join public.beat_offer_files offer_file on offer_file.offer_id=grant_row.offer_id
    where grant_row.id=target_grant_id and grant_row.buyer_id=auth.uid() and grant_row.status='active'
      and offer_file.beat_file_id=target_beat_file_id
      and exists(select 1 from jsonb_array_elements(grant_row.file_manifest) manifest where (manifest->>'beatFileId')::uuid=target_beat_file_id)
  ) then raise exception 'Active Beat file license required.' using errcode='42501'; end if;
  insert into public.beat_license_download_events(grant_id,buyer_id,beat_file_id,ip_hash,user_agent)
  values(target_grant_id,auth.uid(),target_beat_file_id,nullif(target_ip_hash,''),left(nullif(target_user_agent,''),500)) returning id into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service-only exclusive reservation and webhook-authoritative finalization
-- ---------------------------------------------------------------------------

create or replace function public.expire_beat_reservations()
returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  update public.beat_exclusive_reservations set status='expired',completed_at=now() where status='active' and expires_at<=now();
  get diagnostics affected=row_count;
  update public.beat_details details set sale_status='available' where sale_status='reserved'
    and not exists(select 1 from public.beat_exclusive_reservations reservation where reservation.item_id=details.item_id and reservation.status='active' and reservation.expires_at>now());
  return affected;
end;
$$;

create or replace function public.reserve_exclusive_beat_offer(target_offer_id uuid,target_buyer_id uuid,target_idempotency_key text,target_order_id uuid default null,target_ttl_seconds integer default 900)
returns uuid language plpgsql security definer set search_path=public as $$
declare offer_row public.catalog_offers; template_row public.beat_license_templates; existing uuid; result uuid;
begin
  if not coalesce((select checkout_enabled and exclusive_sales_enabled from public.beat_runtime_controls where singleton),false)
    or not coalesce((select checkout_enabled and stripe_payments_enabled and operating_model_approved_at is not null from public.commerce_runtime_controls where singleton),false) then
    raise exception 'Exclusive Beat checkout is disabled.' using errcode='55000';
  end if;
  if nullif(btrim(target_idempotency_key),'') is null or target_ttl_seconds not between 60 and 1800 then raise exception 'Invalid reservation request.' using errcode='22023'; end if;
  perform public.expire_beat_reservations();
  select reservation.id into existing from public.beat_exclusive_reservations reservation where reservation.idempotency_key=target_idempotency_key;
  if existing is not null then return existing; end if;
  select offer.* into offer_row from public.catalog_offers offer where offer.id=target_offer_id and offer.status='active' for update;
  select template.* into template_row from public.beat_license_offers mapping join public.beat_license_templates template on template.id=mapping.template_id where mapping.offer_id=offer_row.id;
  if offer_row.id is null or not template_row.is_exclusive or template_row.status<>'active' then raise exception 'Active exclusive offer required.' using errcode='23514'; end if;
  if exists(select 1 from public.beat_license_grants where item_id=offer_row.item_id and is_exclusive) then raise exception 'This Beat is already sold exclusively.' using errcode='23505'; end if;
  insert into public.beat_exclusive_reservations(item_id,offer_id,buyer_id,order_id,idempotency_key,expires_at)
  values(offer_row.item_id,offer_row.id,target_buyer_id,target_order_id,target_idempotency_key,now()+make_interval(secs=>target_ttl_seconds)) returning id into result;
  update public.beat_details set sale_status='reserved' where item_id=offer_row.item_id;
  return result;
end;
$$;

create or replace function public.finalize_beat_license_purchase(target_order_item_id uuid,target_reservation_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare line public.commerce_order_items; order_row public.commerce_orders; offer_row public.catalog_offers; template_row public.beat_license_templates;
  reservation public.beat_exclusive_reservations; existing uuid; result uuid; seller public.profiles; collaborators jsonb; files jsonb; split_count integer;
begin
  select id into existing from public.beat_license_grants where order_item_id=target_order_item_id;
  if existing is not null then return existing; end if;
  if not coalesce((select checkout_enabled from public.beat_runtime_controls where singleton),false)
    or not coalesce((select checkout_enabled and stripe_payments_enabled and operating_model_approved_at is not null from public.commerce_runtime_controls where singleton),false) then
    raise exception 'Beat checkout is disabled.' using errcode='55000';
  end if;
  select * into line from public.commerce_order_items where id=target_order_item_id for update;
  select * into order_row from public.commerce_orders where id=line.order_id for update;
  select * into offer_row from public.catalog_offers where id=line.offer_id for update;
  select template.* into template_row from public.beat_license_offers mapping join public.beat_license_templates template on template.id=mapping.template_id where mapping.offer_id=offer_row.id;
  if line.id is null or order_row.status not in ('paid','fulfilled') or offer_row.status<>'active' or offer_row.offer_type<>'beat_license' or template_row.status<>'active'
    or line.item_id<>offer_row.item_id or line.unit_price_cents<>offer_row.price_cents or line.currency<>offer_row.currency then
    raise exception 'Paid, exact, active Beat license order required.' using errcode='23514';
  end if;
  if exists(select 1 from public.beat_exclusive_reservations where item_id=line.item_id and status='active' and expires_at>now() and id is distinct from target_reservation_id) then
    raise exception 'This Beat is reserved for exclusive checkout.' using errcode='55000';
  end if;
  select count(*) into split_count from public.beat_collaborator_splits where item_id=line.item_id;
  if split_count<>1 and not coalesce((select split_sales_enabled from public.beat_runtime_controls where singleton),false) then raise exception 'Split Beat sales are disabled.' using errcode='55000'; end if;
  if not template_row.is_exclusive and not coalesce((select nonexclusive_pilot_enabled from public.beat_runtime_controls where singleton),false) then raise exception 'Non-exclusive Beat pilot is disabled.' using errcode='55000'; end if;
  if template_row.is_exclusive then
    if not coalesce((select exclusive_sales_enabled from public.beat_runtime_controls where singleton),false) then raise exception 'Exclusive Beat sales are disabled.' using errcode='55000'; end if;
    select * into reservation from public.beat_exclusive_reservations where id=target_reservation_id and item_id=line.item_id and offer_id=line.offer_id and buyer_id=order_row.buyer_id and status='active' and expires_at>now() for update;
    if reservation.id is null then raise exception 'Active matching exclusive reservation required.' using errcode='23514'; end if;
  end if;
  if exists(select 1 from public.beat_configuration_health(line.item_id)) then raise exception 'Beat configuration is incomplete.' using errcode='23514'; end if;
  select * into seller from public.profiles where id=line.seller_id;
  select coalesce(jsonb_agg(jsonb_build_object('profileId',split.profile_id,'revenueShareBps',split.revenue_share_bps,'publishingShareBps',split.publishing_share_bps,'acceptanceStatus',split.acceptance_status) order by split.profile_id),'[]') into collaborators from public.beat_collaborator_splits split where split.item_id=line.item_id;
  select coalesce(jsonb_agg(jsonb_build_object('beatFileId',file.id,'assetId',file.asset_id,'kind',file.file_kind) order by file.file_kind),'[]') into files
    from public.beat_offer_files mapped join public.beat_files file on file.id=mapped.beat_file_id where mapped.offer_id=line.offer_id;
  perform set_config('os44.beat_service_write','1',true);
  insert into public.beat_license_grants(license_number,order_item_id,buyer_id,item_id,offer_id,template_id,tier_code,is_exclusive,terms_text,terms_sha256,price_cents,currency,seller_id,seller_snapshot,collaborator_snapshot,file_manifest)
  values('44B-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),line.id,order_row.buyer_id,line.item_id,line.offer_id,template_row.id,template_row.tier_code,template_row.is_exclusive,template_row.terms_text,template_row.terms_sha256,line.unit_price_cents,line.currency,line.seller_id,jsonb_build_object('profileId',seller.id,'displayName',seller.display_name,'username',seller.username),collaborators,files)
  returning id into result;
  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at) values(order_row.buyer_id,line.item_id,'purchase','visible',now())
  on conflict(user_id,item_id) do update set status='visible',acquisition_type='purchase';
  if template_row.is_exclusive then
    update public.beat_exclusive_reservations set status='consumed',completed_at=now() where id=reservation.id;
    update public.beat_details set sale_status='sold',sold_at=now() where item_id=line.item_id;
    update public.catalog_offers set status='archived' where item_id=line.item_id;
    update public.catalog_items set status='archived',updated_at=now() where id=line.item_id;
  end if;
  return result;
end;
$$;

create or replace function public.set_beat_license_grant_status(target_grant_id uuid,target_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if target_status not in ('active','revoked','refunded','disputed') then raise exception 'Invalid grant status.' using errcode='22023'; end if;
  perform set_config('os44.beat_service_write','1',true);
  update public.beat_license_grants set status=target_status,status_changed_at=now() where id=target_grant_id;
  if not found then raise exception 'Beat license grant not found.' using errcode='P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dormant submission-review snapshots
-- ---------------------------------------------------------------------------

alter table public.item_submission_assets drop constraint if exists item_submission_assets_asset_type_check;
alter table public.item_submission_assets add constraint item_submission_assets_asset_type_check check(asset_type in('audio','book','book_preview','sample_pack','sample','sample_preview','gallery_image','bonus_content','bonus_achievement','commentary_audio','behind_the_scenes','image','webgl','template','music','merch','beat_mp3','beat_wav','beat_stems','other'));
alter table public.item_submission_offers drop constraint if exists item_submission_offers_offer_type_check;
alter table public.item_submission_offers add constraint item_submission_offers_offer_type_check check(offer_type in('library_access','digital_download','physical_purchase','support','beat_license'));
alter table public.item_submission_offers drop constraint if exists item_submission_offers_fulfillment_type_check;
alter table public.item_submission_offers add constraint item_submission_offers_fulfillment_type_check check(fulfillment_type in('entitlement','physical','none','license'));
alter table public.item_submission_capabilities drop constraint if exists item_submission_capabilities_capability_key_check;
alter table public.item_submission_capabilities add constraint item_submission_capabilities_capability_key_check check(capability_key in('streaming','downloads','achievements','bonus_content','reviews','creator_updates','reader','sample_preview','commentary','behind_the_scenes','events','video','webgl','beat_licensing'));

create table public.item_submission_beat_details (
  submission_id uuid primary key references public.item_submissions(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  preview_track_source_id uuid not null,
  bpm integer not null,time_signature text not null,key_root text,key_mode text,key_not_applicable boolean not null,
  sample_status text not null,sample_disclosure text,sale_status text not null,sold_at timestamptz
);
create table public.item_submission_beat_attributes (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  term_id uuid not null references public.beat_attribute_terms(id) on delete restrict,
  primary key(submission_id,term_id)
);
create table public.item_submission_beat_files (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null,asset_source_id uuid not null,file_kind text not null,
  primary key(submission_id,source_id)
);
create table public.item_submission_beat_license_offers (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  offer_source_id uuid not null,template_id uuid not null references public.beat_license_templates(id) on delete restrict,
  primary key(submission_id,offer_source_id)
);
create table public.item_submission_beat_offer_files (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  offer_source_id uuid not null,beat_file_source_id uuid not null,
  primary key(submission_id,offer_source_id,beat_file_source_id)
);
create table public.item_submission_beat_splits (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  revenue_share_bps integer not null,publishing_share_bps integer not null,acceptance_status text not null,accepted_at timestamptz,
  primary key(submission_id,profile_id)
);

alter function public.snapshot_item_for_submission(uuid,uuid) rename to snapshot_item_for_submission_core;
create or replace function public.snapshot_item_for_submission(target_submission_id uuid,target_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.snapshot_item_for_submission_core(target_submission_id,target_item_id);
  insert into public.item_submission_beat_details select target_submission_id,d.item_id,d.preview_track_id,d.bpm,d.time_signature,d.key_root,d.key_mode,d.key_not_applicable,d.sample_status,d.sample_disclosure,d.sale_status,d.sold_at from public.beat_details d where d.item_id=target_item_id;
  insert into public.item_submission_beat_attributes select target_submission_id,a.term_id from public.beat_attribute_assignments a where a.item_id=target_item_id;
  insert into public.item_submission_beat_files select target_submission_id,f.id,f.asset_id,f.file_kind from public.beat_files f where f.item_id=target_item_id;
  insert into public.item_submission_beat_license_offers select target_submission_id,m.offer_id,m.template_id from public.beat_license_offers m join public.catalog_offers o on o.id=m.offer_id where o.item_id=target_item_id;
  insert into public.item_submission_beat_offer_files select target_submission_id,m.offer_id,m.beat_file_id from public.beat_offer_files m join public.catalog_offers o on o.id=m.offer_id where o.item_id=target_item_id;
  insert into public.item_submission_beat_splits select target_submission_id,s.profile_id,s.revenue_share_bps,s.publishing_share_bps,s.acceptance_status,s.accepted_at from public.beat_collaborator_splits s where s.item_id=target_item_id;
end;
$$;

create or replace function public.apply_approved_beat_submission()
returns trigger language plpgsql security definer set search_path=public as $$
declare snapshot public.item_submission_beat_details;
begin
  if old.status='pending' and new.status='approved' then
    select * into snapshot from public.item_submission_beat_details where submission_id=new.id;
    if snapshot.submission_id is not null then
      perform set_config('os44.review_apply','1',true);
      insert into public.beat_details(item_id,preview_track_id,bpm,time_signature,key_root,key_mode,key_not_applicable,sample_status,sample_disclosure,sale_status,sold_at)
      values(snapshot.item_id,snapshot.preview_track_source_id,snapshot.bpm,snapshot.time_signature,snapshot.key_root,snapshot.key_mode,snapshot.key_not_applicable,snapshot.sample_status,snapshot.sample_disclosure,snapshot.sale_status,snapshot.sold_at)
      on conflict(item_id) do update set preview_track_id=excluded.preview_track_id,bpm=excluded.bpm,time_signature=excluded.time_signature,key_root=excluded.key_root,key_mode=excluded.key_mode,key_not_applicable=excluded.key_not_applicable,sample_status=excluded.sample_status,sample_disclosure=excluded.sample_disclosure,sale_status=excluded.sale_status,sold_at=excluded.sold_at;
      delete from public.beat_attribute_assignments where item_id=snapshot.item_id;
      insert into public.beat_attribute_assignments(item_id,term_id) select snapshot.item_id,term_id from public.item_submission_beat_attributes where submission_id=new.id;
      delete from public.beat_offer_files where offer_id in(select id from public.catalog_offers where item_id=snapshot.item_id);
      delete from public.beat_license_offers where offer_id in(select id from public.catalog_offers where item_id=snapshot.item_id);
      delete from public.beat_files where item_id=snapshot.item_id;
      insert into public.beat_files(id,item_id,asset_id,file_kind) select source_id,snapshot.item_id,asset_source_id,file_kind from public.item_submission_beat_files where submission_id=new.id;
      insert into public.beat_license_offers(offer_id,template_id) select offer_source_id,template_id from public.item_submission_beat_license_offers where submission_id=new.id;
      insert into public.beat_offer_files(offer_id,beat_file_id) select offer_source_id,beat_file_source_id from public.item_submission_beat_offer_files where submission_id=new.id;
      delete from public.beat_collaborator_splits where item_id=snapshot.item_id;
      insert into public.beat_collaborator_splits(item_id,profile_id,revenue_share_bps,publishing_share_bps,acceptance_status,accepted_at)
      select snapshot.item_id,profile_id,revenue_share_bps,publishing_share_bps,acceptance_status,accepted_at from public.item_submission_beat_splits where submission_id=new.id;
    end if;
  end if;
  return new;
end;
$$;
create trigger item_submissions_apply_approved_beat after update of status on public.item_submissions
for each row execute function public.apply_approved_beat_submission();

do $$ declare table_name text; begin
  foreach table_name in array array['beat_details','beat_attribute_assignments','beat_files','beat_license_offers','beat_offer_files','beat_collaborator_splits'] loop
    execute format('drop trigger if exists review_live_write_fence on public.%I',table_name);
    execute format('create trigger review_live_write_fence before insert or update or delete on public.%I for each row execute function public.reject_live_item_mutation_during_review()',table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table public.beat_runtime_controls enable row level security;
alter table public.beat_details enable row level security;
alter table public.beat_attribute_terms enable row level security;
alter table public.beat_attribute_assignments enable row level security;
alter table public.beat_files enable row level security;
alter table public.beat_license_templates enable row level security;
alter table public.beat_license_offers enable row level security;
alter table public.beat_offer_files enable row level security;
alter table public.beat_collaborator_splits enable row level security;
alter table public.beat_license_grants enable row level security;
alter table public.beat_license_download_events enable row level security;
alter table public.beat_exclusive_reservations enable row level security;
alter table public.item_submission_beat_details enable row level security;
alter table public.item_submission_beat_attributes enable row level security;
alter table public.item_submission_beat_files enable row level security;
alter table public.item_submission_beat_license_offers enable row level security;
alter table public.item_submission_beat_offer_files enable row level security;
alter table public.item_submission_beat_splits enable row level security;

create policy beat_runtime_controls_admin_read on public.beat_runtime_controls for select to authenticated using(public.is_platform_admin());
create policy beat_details_public_or_manager_read on public.beat_details for select using(public.can_manage_item(item_id) or(public.beat_catalog_enabled() and exists(select 1 from public.catalog_items item where item.id=item_id and item.status='published')));
create policy beat_details_manager_write on public.beat_details for all to authenticated using(public.can_manage_item(item_id)) with check(public.can_manage_item(item_id));
create policy beat_attribute_terms_read on public.beat_attribute_terms for select using(is_active or public.is_platform_admin());
create policy beat_attribute_terms_admin_write on public.beat_attribute_terms for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy beat_attribute_assignments_public_or_manager_read on public.beat_attribute_assignments for select using(public.can_manage_item(item_id) or(public.beat_catalog_enabled() and exists(select 1 from public.catalog_items item where item.id=item_id and item.status='published')));
create policy beat_attribute_assignments_manager_write on public.beat_attribute_assignments for all to authenticated using(public.can_manage_item(item_id)) with check(public.can_manage_item(item_id));
create policy beat_files_manager_read on public.beat_files for select to authenticated using(public.can_manage_item(item_id));
create policy beat_files_manager_write on public.beat_files for all to authenticated using(public.can_manage_item(item_id)) with check(public.can_manage_item(item_id));
create policy beat_license_templates_referenced_read on public.beat_license_templates for select using(status='active' or public.is_platform_admin() or exists(select 1 from public.beat_license_offers mapped join public.catalog_offers offer on offer.id=mapped.offer_id where mapped.template_id=id and public.can_manage_item(offer.item_id)));
create policy beat_license_offers_public_or_manager_read on public.beat_license_offers for select using(exists(select 1 from public.catalog_offers offer join public.catalog_items item on item.id=offer.item_id where offer.id=offer_id and(public.can_manage_item(offer.item_id) or(offer.status='active' and item.status='published' and public.beat_catalog_enabled()))));
create policy beat_license_offers_manager_write on public.beat_license_offers for all to authenticated using(exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id))) with check(exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id)));
create policy beat_offer_files_public_or_manager_read on public.beat_offer_files for select using(exists(select 1 from public.catalog_offers offer join public.catalog_items item on item.id=offer.item_id where offer.id=offer_id and(public.can_manage_item(offer.item_id) or(offer.status='active' and item.status='published' and public.beat_catalog_enabled()))));
create policy beat_offer_files_manager_write on public.beat_offer_files for all to authenticated using(exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id))) with check(exists(select 1 from public.catalog_offers offer where offer.id=offer_id and public.can_manage_item(offer.item_id)));
create policy beat_splits_manager_read on public.beat_collaborator_splits for select to authenticated using(public.can_manage_item(item_id) or profile_id=auth.uid());
create policy beat_splits_manager_write on public.beat_collaborator_splits for all to authenticated using(public.can_manage_item(item_id)) with check(public.can_manage_item(item_id));
create policy beat_license_grants_buyer_read on public.beat_license_grants for select to authenticated using(buyer_id=auth.uid() or public.can_manage_item(item_id) or public.is_platform_admin());
create policy beat_download_events_buyer_read on public.beat_license_download_events for select to authenticated using(buyer_id=auth.uid() or exists(select 1 from public.beat_license_grants grant_row where grant_row.id=grant_id and(public.can_manage_item(grant_row.item_id) or public.is_platform_admin())));

do $$ declare table_name text; begin
  foreach table_name in array array['item_submission_beat_details','item_submission_beat_attributes','item_submission_beat_files','item_submission_beat_license_offers','item_submission_beat_offer_files','item_submission_beat_splits'] loop
    execute format('create policy %I on public.%I for select to authenticated using(exists(select 1 from public.item_submissions submission where submission.id=submission_id and(submission.submitter_id=auth.uid() or public.is_platform_admin())))',table_name||'_owner_read',table_name);
  end loop;
end $$;

revoke all on public.beat_runtime_controls,public.beat_details,public.beat_attribute_terms,public.beat_attribute_assignments,public.beat_files,public.beat_license_templates,public.beat_license_offers,public.beat_offer_files,public.beat_collaborator_splits,public.beat_license_grants,public.beat_license_download_events,public.beat_exclusive_reservations from anon,authenticated;
grant select on public.beat_details,public.beat_attribute_terms,public.beat_attribute_assignments,public.beat_license_templates,public.beat_license_offers,public.beat_offer_files to anon,authenticated;
grant insert,update,delete on public.beat_details,public.beat_attribute_assignments,public.beat_files,public.beat_license_offers,public.beat_offer_files,public.beat_collaborator_splits to authenticated;
grant select on public.beat_files,public.beat_collaborator_splits,public.beat_license_grants,public.beat_license_download_events to authenticated;
grant all on public.beat_runtime_controls,public.beat_details,public.beat_attribute_terms,public.beat_attribute_assignments,public.beat_files,public.beat_license_templates,public.beat_license_offers,public.beat_offer_files,public.beat_collaborator_splits,public.beat_license_grants,public.beat_license_download_events,public.beat_exclusive_reservations to service_role;
grant execute on function public.record_beat_file_download(uuid,uuid,text,text) to authenticated;
revoke all on function public.reserve_exclusive_beat_offer(uuid,uuid,text,uuid,integer),public.finalize_beat_license_purchase(uuid,uuid),public.set_beat_license_grant_status(uuid,text),public.expire_beat_reservations() from public,anon,authenticated;
grant execute on function public.reserve_exclusive_beat_offer(uuid,uuid,text,uuid,integer),public.finalize_beat_license_purchase(uuid,uuid),public.set_beat_license_grant_status(uuid,text),public.expire_beat_reservations() to service_role;

do $$ declare table_name text; begin
  foreach table_name in array array['item_submission_beat_details','item_submission_beat_attributes','item_submission_beat_files','item_submission_beat_license_offers','item_submission_beat_offer_files','item_submission_beat_splits'] loop
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
    execute format('grant all on public.%I to service_role',table_name);
  end loop;
end $$;

comment on table public.beat_runtime_controls is 'Fail-closed Beat catalog, publishing, pilot checkout, splits, and exclusive-sale gates. M18 leaves all switches disabled.';
comment on table public.beat_license_templates is 'Versioned platform-owned Beat license terms. Draft seed text is intentionally unusable for commerce until counsel approval creates an active version.';
comment on table public.beat_license_grants is 'Immutable buyer contract, price, seller, collaborator, and file-manifest snapshot tied one-to-one to a paid order line.';
comment on table public.beat_exclusive_reservations is 'Service-only, expiring Beat-level lock used to serialize exclusive checkout.';
