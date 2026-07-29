-- M18 follow-through: original non-exclusive Beat licenses and verified fulfillment.
-- This intentionally leaves catalog, publishing, and checkout controls fail-closed.

alter table public.beat_license_templates
  add column if not exists platform_approved_at timestamptz;

alter table public.beat_license_templates
  drop constraint if exists beat_license_template_activation_check;
alter table public.beat_license_templates
  add constraint beat_license_template_activation_check check(
    status <> 'active'
    or (
      platform_approved_at is not null
      and approved_by is not null
      and char_length(terms_text) >= 500
      and not is_exclusive
      and tier_code in ('basic','premium','trackout')
    )
  );

insert into public.beat_license_templates(
  tier_code,version,title,short_summary,included_file_kinds,is_exclusive,terms_text
) values
(
  'basic',2,'Basic License','Non-exclusive license with an untagged MP3.',
  array['untagged_mp3'],false,
  $license$44OS STANDARD NON-EXCLUSIVE BEAT LICENSE — BASIC (VERSION 2)

LICENSE RECORD. This license is an agreement between the creator identified as the seller in the 44OS license record (“Licensor”) and the buyer identified in that record (“Licensee”). The licensed Beat, price, date, license number, and terms digest are the values stored with that record. The license becomes effective only after 44OS records a completed payment. 44OS provides the marketplace, record, and file delivery service; 44OS is not the Licensor, does not acquire ownership of the Beat, and is not responsible for enforcing either party’s rights.

GRANT. Licensor grants Licensee a non-exclusive, worldwide, perpetual license to use the Beat to create one new original song or instrumental work (“New Song”). Licensee may write, record, edit, arrange, mix, and master the New Song; distribute and monetize audio recordings of it without a copy, download, stream, or performance cap; perform it publicly; broadcast it; and use it in promotional social posts, lyric videos, visualizers, and music videos whose primary purpose is promoting the New Song. This license includes an untagged MP3 delivery file. No ownership in the Beat or its underlying composition is transferred.

LIMITS. Licensee may not sell, share, upload, distribute, or sublicense the Beat or any delivered file by itself; make the Beat or stems available as a sample, loop, stock-music asset, template, or production library; falsely claim authorship or exclusive ownership of the Beat; register the Beat itself with a copyright office; or place the Beat, the delivered files, or the New Song into YouTube Content ID, Meta Rights Manager, Audible Magic, or another automated rights-claiming system without Licensor’s separate written consent. Film, television, advertising, game, app, podcast-theme, theatrical, and other third-party synchronization uses require a separate written license from Licensor. Licensee may not transfer this license except with Licensor’s written agreement.

OWNERSHIP, CREDIT, AND SAMPLES. Licensor keeps all ownership in the Beat and may continue licensing it to other people. Licensee owns Licensee’s original lyrics, vocals, and other original additions, subject to Licensor’s rights in the Beat. Existing non-exclusive licenses survive later sales or changes in availability. Where credits are reasonably provided, Licensee will credit the producer using the seller name in the license record, for example “Produced by [Licensor].” Licensor is responsible for accurately disclosing known third-party samples or loops in the Beat listing and represents that Licensor controls the rights needed to offer this license. Licensee remains responsible for material Licensee adds to the New Song and for any use outside this license.

BREACH AND RECORDS. A material breach not cured within fourteen days after written notice from Licensor may terminate this license. Uses made while the license was active remain subject to applicable law, and unpaid or prohibited uses are not authorized. The immutable 44OS license record, terms digest, seller snapshot, and file manifest are evidence of the license delivered at purchase. A refund, chargeback, or payment dispute may change the record status and suspend downloads. Any claim or enforcement decision is between Licensor and Licensee under applicable law. Neither party is promised a particular commercial result, and neither party may represent that 44OS endorsed the Beat, the New Song, or a legal claim.$license$
),
(
  'premium',2,'Premium License','Non-exclusive license with untagged MP3 and WAV files.',
  array['untagged_mp3','untagged_wav'],false,
  $license$44OS STANDARD NON-EXCLUSIVE BEAT LICENSE — PREMIUM (VERSION 2)

LICENSE RECORD. This license is an agreement between the creator identified as the seller in the 44OS license record (“Licensor”) and the buyer identified in that record (“Licensee”). The licensed Beat, price, date, license number, and terms digest are the values stored with that record. The license becomes effective only after 44OS records a completed payment. 44OS provides the marketplace, record, and file delivery service; 44OS is not the Licensor, does not acquire ownership of the Beat, and is not responsible for enforcing either party’s rights.

GRANT. Licensor grants Licensee a non-exclusive, worldwide, perpetual license to use the Beat to create one new original song or instrumental work (“New Song”). Licensee may write, record, edit, arrange, mix, and master the New Song; distribute and monetize audio recordings of it without a copy, download, stream, or performance cap; perform it publicly; broadcast it; and use it in promotional social posts, lyric videos, visualizers, and music videos whose primary purpose is promoting the New Song. This license includes untagged MP3 and WAV delivery files. No ownership in the Beat or its underlying composition is transferred.

LIMITS. Licensee may not sell, share, upload, distribute, or sublicense the Beat or any delivered file by itself; make the Beat or stems available as a sample, loop, stock-music asset, template, or production library; falsely claim authorship or exclusive ownership of the Beat; register the Beat itself with a copyright office; or place the Beat, the delivered files, or the New Song into YouTube Content ID, Meta Rights Manager, Audible Magic, or another automated rights-claiming system without Licensor’s separate written consent. Film, television, advertising, game, app, podcast-theme, theatrical, and other third-party synchronization uses require a separate written license from Licensor. Licensee may not transfer this license except with Licensor’s written agreement.

OWNERSHIP, CREDIT, AND SAMPLES. Licensor keeps all ownership in the Beat and may continue licensing it to other people. Licensee owns Licensee’s original lyrics, vocals, and other original additions, subject to Licensor’s rights in the Beat. Existing non-exclusive licenses survive later sales or changes in availability. Where credits are reasonably provided, Licensee will credit the producer using the seller name in the license record, for example “Produced by [Licensor].” Licensor is responsible for accurately disclosing known third-party samples or loops in the Beat listing and represents that Licensor controls the rights needed to offer this license. Licensee remains responsible for material Licensee adds to the New Song and for any use outside this license.

BREACH AND RECORDS. A material breach not cured within fourteen days after written notice from Licensor may terminate this license. Uses made while the license was active remain subject to applicable law, and unpaid or prohibited uses are not authorized. The immutable 44OS license record, terms digest, seller snapshot, and file manifest are evidence of the license delivered at purchase. A refund, chargeback, or payment dispute may change the record status and suspend downloads. Any claim or enforcement decision is between Licensor and Licensee under applicable law. Neither party is promised a particular commercial result, and neither party may represent that 44OS endorsed the Beat, the New Song, or a legal claim.$license$
),
(
  'trackout',2,'Trackout License','Non-exclusive license with MP3, WAV, and trackout stems.',
  array['untagged_mp3','untagged_wav','stems_zip'],false,
  $license$44OS STANDARD NON-EXCLUSIVE BEAT LICENSE — TRACKOUT (VERSION 2)

LICENSE RECORD. This license is an agreement between the creator identified as the seller in the 44OS license record (“Licensor”) and the buyer identified in that record (“Licensee”). The licensed Beat, price, date, license number, and terms digest are the values stored with that record. The license becomes effective only after 44OS records a completed payment. 44OS provides the marketplace, record, and file delivery service; 44OS is not the Licensor, does not acquire ownership of the Beat, and is not responsible for enforcing either party’s rights.

GRANT. Licensor grants Licensee a non-exclusive, worldwide, perpetual license to use the Beat to create one new original song or instrumental work (“New Song”). Licensee may write, record, edit, arrange, mix, and master the New Song; distribute and monetize audio recordings of it without a copy, download, stream, or performance cap; perform it publicly; broadcast it; and use it in promotional social posts, lyric videos, visualizers, and music videos whose primary purpose is promoting the New Song. This license includes untagged MP3, WAV, and trackout/stem delivery files. No ownership in the Beat or its underlying composition is transferred.

LIMITS. Licensee may not sell, share, upload, distribute, or sublicense the Beat or any delivered file by itself; make the Beat or stems available as a sample, loop, stock-music asset, template, or production library; falsely claim authorship or exclusive ownership of the Beat; register the Beat itself with a copyright office; or place the Beat, the delivered files, or the New Song into YouTube Content ID, Meta Rights Manager, Audible Magic, or another automated rights-claiming system without Licensor’s separate written consent. Film, television, advertising, game, app, podcast-theme, theatrical, and other third-party synchronization uses require a separate written license from Licensor. Licensee may not transfer this license except with Licensor’s written agreement.

OWNERSHIP, CREDIT, AND SAMPLES. Licensor keeps all ownership in the Beat and may continue licensing it to other people. Licensee owns Licensee’s original lyrics, vocals, and other original additions, subject to Licensor’s rights in the Beat. Existing non-exclusive licenses survive later sales or changes in availability. Where credits are reasonably provided, Licensee will credit the producer using the seller name in the license record, for example “Produced by [Licensor].” Licensor is responsible for accurately disclosing known third-party samples or loops in the Beat listing and represents that Licensor controls the rights needed to offer this license. Licensee remains responsible for material Licensee adds to the New Song and for any use outside this license.

BREACH AND RECORDS. A material breach not cured within fourteen days after written notice from Licensor may terminate this license. Uses made while the license was active remain subject to applicable law, and unpaid or prohibited uses are not authorized. The immutable 44OS license record, terms digest, seller snapshot, and file manifest are evidence of the license delivered at purchase. A refund, chargeback, or payment dispute may change the record status and suspend downloads. Any claim or enforcement decision is between Licensor and Licensee under applicable law. Neither party is promised a particular commercial result, and neither party may represent that 44OS endorsed the Beat, the New Song, or a legal claim.$license$
)
on conflict(tier_code,version) do nothing;

-- Exclusive is outside the approved product scope.
update public.catalog_offers
set status='archived',updated_at=now()
where code='beat-exclusive' and status <> 'archived';

-- Review-only drafts may be created while every public catalog and checkout
-- control remains off. The client build flag is still required.
update public.beat_runtime_controls
set review_surfaces_enabled=true,updated_at=now()
where singleton;

create or replace function public.activate_standard_nonexclusive_beat_licenses()
returns void language plpgsql security definer set search_path=public as $$
declare tier text; active_template public.beat_license_templates;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator approval is required.' using errcode='42501';
  end if;
  foreach tier in array array['basic','premium','trackout'] loop
    update public.beat_license_templates
    set status='active',platform_approved_at=now(),approved_by=auth.uid(),updated_at=now()
    where id=(
      select id from public.beat_license_templates
      where tier_code=tier and status='draft' and version=2
      order by version desc limit 1
    )
    returning * into active_template;
    if active_template.id is null then
      raise exception 'Version 2 % template is missing.',tier using errcode='55000';
    end if;
    insert into public.beat_license_templates(
      tier_code,version,title,short_summary,included_file_kinds,is_exclusive,terms_text
    ) values(
      active_template.tier_code,active_template.version+1,active_template.title,
      active_template.short_summary,active_template.included_file_kinds,false,active_template.terms_text
    ) on conflict(tier_code,version) do nothing;
  end loop;
end;
$$;
revoke all on function public.activate_standard_nonexclusive_beat_licenses() from public,anon;
grant execute on function public.activate_standard_nonexclusive_beat_licenses() to authenticated,service_role;

-- Once a standard version is active, creator drafts automatically reference it
-- even though save_owned_beat_draft keeps a separate editable staging version.
create or replace function public.prefer_active_nonexclusive_beat_template()
returns trigger language plpgsql set search_path=public as $$
declare requested public.beat_license_templates; active_id uuid;
begin
  select * into requested from public.beat_license_templates where id=new.template_id;
  if requested.tier_code='exclusive' or requested.is_exclusive then
    raise exception 'Exclusive Beat licenses are not supported.' using errcode='0A000';
  end if;
  if requested.status='draft' then
    select id into active_id from public.beat_license_templates
    where tier_code=requested.tier_code and status='active' and not is_exclusive
    order by version desc limit 1;
    new.template_id:=coalesce(active_id,new.template_id);
  end if;
  return new;
end;
$$;
drop trigger if exists beat_license_offers_prefer_active_template on public.beat_license_offers;
create trigger beat_license_offers_prefer_active_template
before insert or update of template_id on public.beat_license_offers
for each row execute function public.prefer_active_nonexclusive_beat_template();

alter table public.commerce_order_items
  add column if not exists beat_license_snapshot jsonb not null default '{}';

create or replace function public.enforce_commerce_order_item_eligibility()
returns trigger language plpgsql security definer set search_path=public as $$
declare item_row public.catalog_items;
declare controls public.commerce_runtime_controls;
begin
  select * into item_row from public.catalog_items where id=new.item_id;
  select * into controls from public.commerce_runtime_controls where singleton;
  if item_row.id is null or new.seller_id is distinct from item_row.author_id then
    raise exception 'Order seller identity is invalid.' using errcode='55000';
  end if;
  if new.offer_type='physical_purchase' then
    if item_row.experience_type<>'merch' or item_row.author_id is distinct from controls.platform_seller_id then
      raise exception 'Physical checkout is limited to 44-owned Merch.' using errcode='55000';
    end if;
  elsif new.offer_type='digital_download' then
    if item_row.experience_type not in ('music','book','asset')
      or not public.is_creator_paid_sales_enabled(item_row.author_id) then
      raise exception 'This creator is not enabled for paid sales.' using errcode='55000';
    end if;
  elsif new.offer_type='beat_license' then
    if not public.is_beat_item(item_row.id)
      or not public.is_creator_paid_sales_enabled(item_row.author_id)
      or not coalesce((select checkout_enabled and nonexclusive_pilot_enabled from public.beat_runtime_controls where singleton),false) then
      raise exception 'This creator or Beat is not enabled for paid licensing.' using errcode='55000';
    end if;
  else
    raise exception 'This offer type is not enabled for Checkout.' using errcode='55000';
  end if;
  return new;
end;
$$;

create or replace function public.snapshot_beat_license_order_line()
returns trigger language plpgsql security definer set search_path=public as $$
declare template public.beat_license_templates; files jsonb; collaborators jsonb;
begin
  if new.offer_type <> 'beat_license' then return new; end if;
  select license.* into template
  from public.beat_license_offers mapping
  join public.beat_license_templates license on license.id=mapping.template_id
  where mapping.offer_id=new.offer_id;
  if template.id is null or template.status <> 'active' or template.is_exclusive
    or template.tier_code not in ('basic','premium','trackout') then
    raise exception 'An active standard non-exclusive Beat license is required.' using errcode='23514';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'beatFileId',file.id,'assetId',file.asset_id,'kind',file.file_kind
  ) order by file.file_kind),'[]'::jsonb) into files
  from public.beat_offer_files mapped
  join public.beat_files file on file.id=mapped.beat_file_id
  where mapped.offer_id=new.offer_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'profileId',split.profile_id,'revenueShareBps',split.revenue_share_bps,
    'publishingShareBps',split.publishing_share_bps,'acceptanceStatus',split.acceptance_status
  ) order by split.profile_id),'[]'::jsonb) into collaborators
  from public.beat_collaborator_splits split where split.item_id=new.item_id;
  new.beat_license_snapshot:=jsonb_build_object(
    'templateId',template.id,'tierCode',template.tier_code,'isExclusive',false,
    'title',template.title,'termsText',template.terms_text,'termsSha256',template.terms_sha256,
    'includedFileKinds',template.included_file_kinds,'files',files,'collaborators',collaborators
  );
  return new;
end;
$$;
drop trigger if exists commerce_order_items_snapshot_beat_license on public.commerce_order_items;
create trigger commerce_order_items_snapshot_beat_license
before insert on public.commerce_order_items
for each row execute function public.snapshot_beat_license_order_line();

create or replace function public.finalize_beat_license_purchase(
  target_order_item_id uuid,target_reservation_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare line public.commerce_order_items; order_row public.commerce_orders;
  existing uuid; result uuid; snapshot jsonb; snapshot_template_id uuid;
  snapshot_tier text; snapshot_terms text; snapshot_sha text; files jsonb; collaborators jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  select id into existing from public.beat_license_grants where order_item_id=target_order_item_id;
  if existing is not null then return existing; end if;
  if not coalesce((select checkout_enabled and nonexclusive_pilot_enabled from public.beat_runtime_controls where singleton),false)
    or not coalesce((select checkout_enabled and stripe_payments_enabled and operating_model_approved_at is not null from public.commerce_runtime_controls where singleton),false) then
    raise exception 'Beat checkout is disabled.' using errcode='55000';
  end if;
  select * into line from public.commerce_order_items where id=target_order_item_id for update;
  if line.id is null or line.offer_type <> 'beat_license' then
    raise exception 'Beat license order line not found.' using errcode='P0002';
  end if;
  select * into order_row from public.commerce_orders where id=line.order_id for update;
  if order_row.status not in ('paid','fulfilled','partially_refunded') then
    raise exception 'A verified paid Beat license order is required.' using errcode='23514';
  end if;
  snapshot:=line.beat_license_snapshot;
  begin
    snapshot_template_id:=(snapshot->>'templateId')::uuid;
  exception when others then
    raise exception 'Beat license snapshot is invalid.' using errcode='23514';
  end;
  snapshot_tier:=snapshot->>'tierCode';
  snapshot_terms:=snapshot->>'termsText';
  snapshot_sha:=snapshot->>'termsSha256';
  files:=coalesce(snapshot->'files','[]'::jsonb);
  collaborators:=coalesce(snapshot->'collaborators','[]'::jsonb);
  if snapshot_tier not in ('basic','premium','trackout')
    or coalesce((snapshot->>'isExclusive')::boolean,true)
    or nullif(snapshot_terms,'') is null or snapshot_sha !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(files) <> 'array' or jsonb_array_length(files)=0
    or not exists(select 1 from public.beat_license_templates where id=snapshot_template_id and terms_sha256=snapshot_sha) then
    raise exception 'Beat license snapshot is incomplete.' using errcode='23514';
  end if;
  if exists(select 1 from public.beat_configuration_health(line.item_id)) then
    raise exception 'Beat configuration is incomplete.' using errcode='23514';
  end if;
  perform set_config('os44.beat_service_write','1',true);
  insert into public.beat_license_grants(
    license_number,order_item_id,buyer_id,item_id,offer_id,template_id,tier_code,is_exclusive,
    terms_text,terms_sha256,price_cents,currency,seller_id,seller_snapshot,collaborator_snapshot,file_manifest
  ) values(
    '44B-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
    line.id,order_row.buyer_id,line.item_id,line.offer_id,snapshot_template_id,snapshot_tier,false,
    snapshot_terms,snapshot_sha,line.unit_price_cents,line.currency,line.seller_id,line.seller_snapshot,collaborators,files
  ) returning id into result;
  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
  values(order_row.buyer_id,line.item_id,'purchase','visible',now())
  on conflict(user_id,item_id) do update set status='visible',acquisition_type='purchase';
  return result;
end;
$$;

create or replace function public.sync_beat_license_grants_from_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare line record; next_status text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status in ('paid','fulfilled') then
    for line in select id from public.commerce_order_items where order_id=new.id and offer_type='beat_license' loop
      perform public.finalize_beat_license_purchase(line.id,null);
    end loop;
    next_status:='active';
  elsif new.status='refunded' then next_status:='refunded';
  elsif new.status in ('disputed','dispute_lost') then next_status:='disputed';
  elsif old.status in ('disputed','dispute_lost') and new.status in ('paid','partially_refunded') then next_status:='active';
  else return new;
  end if;
  perform set_config('os44.beat_service_write','1',true);
  update public.beat_license_grants grant_row
  set status=next_status,status_changed_at=now()
  where grant_row.order_item_id in(
    select id from public.commerce_order_items where order_id=new.id and offer_type='beat_license'
  ) and grant_row.status is distinct from next_status;
  return new;
end;
$$;
drop trigger if exists commerce_orders_sync_beat_license_grants on public.commerce_orders;
create trigger commerce_orders_sync_beat_license_grants
after update of status on public.commerce_orders
for each row execute function public.sync_beat_license_grants_from_order();

create or replace function public.has_active_beat_file_grant(target_user_id uuid,target_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.beat_license_grants grant_row
    where grant_row.buyer_id=target_user_id and grant_row.status='active'
      and exists(
        select 1 from jsonb_array_elements(grant_row.file_manifest) manifest
        where (manifest->>'assetId')::uuid=target_asset_id
      )
  );
$$;

create or replace function public.record_beat_file_download(
  target_grant_id uuid,target_beat_file_id uuid,target_ip_hash text default null,target_user_agent text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  if not exists(
    select 1 from public.beat_license_grants grant_row
    where grant_row.id=target_grant_id and grant_row.buyer_id=auth.uid() and grant_row.status='active'
      and exists(
        select 1 from jsonb_array_elements(grant_row.file_manifest) manifest
        where (manifest->>'beatFileId')::uuid=target_beat_file_id
      )
  ) then raise exception 'Active Beat file license required.' using errcode='42501'; end if;
  insert into public.beat_license_download_events(grant_id,buyer_id,beat_file_id,ip_hash,user_agent)
  values(target_grant_id,auth.uid(),target_beat_file_id,nullif(target_ip_hash,''),left(nullif(target_user_agent,''),500))
  returning id into result;
  return result;
end;
$$;

create or replace function public.activate_approved_beat_offers()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status='pending' and new.status='approved' then
    update public.catalog_offers offer
    set status='active',updated_at=now()
    from public.beat_license_offers mapping
    join public.beat_license_templates template on template.id=mapping.template_id
    where offer.id=mapping.offer_id
      and offer.item_id=new.item_id
      and template.status='active'
      and not template.is_exclusive
      and coalesce((select catalog_enabled and publishing_enabled from public.beat_runtime_controls where singleton),false);
  end if;
  return new;
end;
$$;
drop trigger if exists zz_item_submissions_activate_beat_offers on public.item_submissions;
create trigger zz_item_submissions_activate_beat_offers
after update of status on public.item_submissions
for each row execute function public.activate_approved_beat_offers();

revoke all on function public.snapshot_beat_license_order_line(),public.sync_beat_license_grants_from_order(),public.activate_approved_beat_offers() from public,anon,authenticated;
grant execute on function public.snapshot_beat_license_order_line(),public.sync_beat_license_grants_from_order(),public.activate_approved_beat_offers() to service_role;

comment on table public.beat_license_templates is
  'Versioned platform-owned standard Beat license terms. Activation requires recorded platform approval; independent legal review is recommended when feasible but is not a runtime dependency.';
comment on column public.beat_license_templates.platform_approved_at is
  'Timestamp when a platform administrator approved this exact immutable terms version for use.';
comment on column public.beat_license_templates.counsel_approved_at is
  'Deprecated legacy field retained for migration compatibility; Beat license activation uses platform_approved_at.';
