-- M13: dormant creator submission/review foundation.
--
-- This migration adds a typed proposal snapshot keyed to the permanent Item
-- identity. It deliberately does not change publishing_runtime_controls; the
-- repository remains in trusted_testing until the complete workflow is reviewed.

create table public.item_submissions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  submitter_id uuid not null references public.profiles(id) on delete restrict,
  submission_kind text not null check (submission_kind in ('create', 'revision')),
  status text not null default 'pending' check (status in ('pending', 'withdrawn', 'approved', 'rejected')),
  policy_version text not null,
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  decision_reason text,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  constraint item_submissions_decision_fields_check check (
    (status in ('approved', 'rejected') and decided_at is not null and decided_by is not null and decision_reason is not null)
    or (status not in ('approved', 'rejected') and decided_at is null and decided_by is null)
  ),
  constraint item_submissions_withdrawal_fields_check check (
    (status = 'withdrawn' and withdrawn_at is not null) or (status <> 'withdrawn' and withdrawn_at is null)
  ),
  unique (submitter_id, idempotency_key)
);

create unique index item_submissions_one_pending_item
  on public.item_submissions(item_id) where status = 'pending';
create index item_submissions_submitter_idx on public.item_submissions(submitter_id, submitted_at desc);
create index item_submissions_review_idx on public.item_submissions(status, submitted_at);

create table public.item_submission_decisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.item_submissions(id) on delete restrict,
  decision text not null check (decision in ('approved','rejected')),
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  policy_version text not null,
  reason text not null,
  decided_at timestamptz not null default now()
);
create index item_submission_decisions_submission_idx on public.item_submission_decisions(submission_id, decided_at desc);
create or replace function public.reject_item_submission_decision_mutation()
returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Submission decisions are immutable.'; end;
$$;
create trigger item_submission_decisions_immutable before update or delete on public.item_submission_decisions for each row execute function public.reject_item_submission_decision_mutation();

create table public.item_submission_child_tombstones (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  child_type text not null check (child_type in ('track','asset','offer','offer_entitlement','type_assignment','tag_assignment','capability','member','external_link','achievement')),
  source_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (submission_id, child_type, source_id)
);

create table public.item_submission_notification_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.item_submissions(id) on delete restrict,
  recipient_id uuid references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','withdrawn','approved','rejected')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (submission_id, recipient_id, event_type)
);
create unique index item_submission_notification_events_admin_unique
  on public.item_submission_notification_events(submission_id, event_type)
  where recipient_id is null;
create index item_submission_notification_events_pending_idx on public.item_submission_notification_events(recipient_id, created_at) where delivered_at is null;
create or replace function public.reject_item_submission_notification_mutation()
returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Submission notification events are immutable.'; end;
$$;
create trigger item_submission_notification_events_immutable before update or delete on public.item_submission_notification_events for each row execute function public.reject_item_submission_notification_mutation();

create table public.item_child_archives (
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  child_type text not null check (child_type in ('track','asset','offer','offer_entitlement','type_assignment','tag_assignment','capability','member','external_link','achievement')),
  child_id uuid not null,
  archived_at timestamptz not null default now(),
  archived_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  primary key (item_id, child_type, child_id)
);
create or replace function public.reject_item_child_archive_mutation()
returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Item child archives are immutable.'; end;
$$;
create trigger item_child_archives_immutable before update or delete on public.item_child_archives for each row execute function public.reject_item_child_archive_mutation();

create or replace function public.record_item_submission_event(target_submission_id uuid, target_event_type text, target_recipient_id uuid, target_payload jsonb default '{}')
returns void language sql security definer set search_path=public as $$
  insert into public.item_submission_notification_events(submission_id,recipient_id,event_type,payload)
  values(target_submission_id,target_recipient_id,target_event_type,coalesce(target_payload,'{}'))
  on conflict (submission_id,recipient_id,event_type) do nothing;
$$;

-- A typed Item snapshot. JSON is intentionally not used for the proposed Item
-- contract; each supported field remains constrained by the catalog schema.
create table public.item_submission_items (
  submission_id uuid primary key references public.item_submissions(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete restrict,
  item_category_id uuid references public.item_categories(id) on delete restrict,
  slug text not null,
  title text not null,
  creator text not null,
  item_type text not null,
  price_cents integer not null check (price_cents >= 0),
  is_free boolean not null,
  featured boolean not null,
  tags text[] not null default '{}',
  cover_url text,
  hero_url text,
  year integer,
  feature_description text,
  launch_url text,
  read_url text,
  download_url text,
  author_id uuid not null references public.profiles(id) on delete restrict,
  short_description text,
  long_description text,
  market_mode text not null check (market_mode in ('global', 'global_plus_local')),
  local_price_cents integer,
  local_currency text,
  available_locally_only boolean not null,
  experience_type text not null check (experience_type in ('music','book','asset','radio','video','game','merch','other')),
  fulfillment_type text not null check (fulfillment_type in ('digital','physical','hybrid')),
  streaming_enabled boolean not null,
  download_purchase_enabled boolean not null,
  sort_order bigint,
  merch_fulfillment_mode text,
  merch_shipping_scope text,
  unique (submission_id, item_id)
);

create table public.item_submission_tracks (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  number integer not null,
  title text not null,
  duration_seconds integer,
  audio_url text,
  download_url text,
  primary key (submission_id, source_id)
);

create table public.item_submission_assets (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  asset_type text not null check (asset_type in ('audio','book','sample_pack','gallery_image','bonus_content','commentary_audio','behind_the_scenes','image','webgl','template','music','merch','other')),
  title text not null,
  file_url text,
  storage_path text,
  is_downloadable boolean not null,
  sort_order integer not null,
  primary key (submission_id, source_id)
);

create table public.item_submission_offers (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  code text not null,
  offer_type text not null check (offer_type in ('library_access','digital_download','physical_purchase','support')),
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('draft','active','archived')),
  fulfillment_type text not null check (fulfillment_type in ('entitlement','physical','none')),
  quantity_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  primary key (submission_id, source_id),
  unique (submission_id, code),
  check (quantity_limit is null or quantity_limit > 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.item_submission_offer_entitlements (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  offer_source_id uuid not null,
  entitlement_type text not null check (entitlement_type in ('library_access','download','read','launch','bonus_content')),
  primary key (submission_id, offer_source_id, entitlement_type),
  foreign key (submission_id, offer_source_id) references public.item_submission_offers(submission_id, source_id) on delete cascade
);

create table public.item_submission_type_assignments (
  submission_id uuid primary key references public.item_submissions(id) on delete cascade,
  item_type_id uuid not null references public.item_types(id) on delete restrict
);

create table public.item_submission_tag_assignments (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  item_tag_id uuid not null references public.item_tags(id) on delete restrict,
  primary key (submission_id, item_tag_id)
);

create table public.item_submission_capabilities (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  capability_key text not null check (capability_key in ('streaming','downloads','achievements','bonus_content','reviews','creator_updates','reader','sample_preview','commentary','behind_the_scenes','events','video','webgl')),
  config_version integer not null check (config_version > 0),
  is_enabled boolean not null,
  primary key (submission_id, capability_key)
);

create table public.item_submission_members (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  member_role text not null check (member_role in ('owner','editor','contributor')),
  primary key (submission_id, profile_id)
);

create table public.item_submission_external_links (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null check (url ~* '^https://'),
  sort_order integer not null,
  primary key (submission_id, source_id)
);

create table public.item_submission_achievements (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  trigger_type text not null,
  reward_item_id uuid references public.catalog_items(id) on delete restrict,
  sort_order integer not null,
  is_secret boolean not null,
  trigger_config jsonb not null default '{}',
  reward_config jsonb not null default '{}',
  points integer not null,
  icon text,
  template_id uuid references public.achievement_templates(id) on delete restrict,
  primary key (submission_id, source_id)
);

create or replace function public.publishing_review_is_required()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select review_required from public.publishing_runtime_controls where singleton), false);
$$;
revoke all on function public.publishing_review_is_required() from public, anon, authenticated;
grant execute on function public.publishing_review_is_required() to authenticated, service_role;

create or replace function public.reject_live_item_mutation_during_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.publishing_review_is_required() and coalesce(current_setting('os44.review_apply', true), '') <> '1' then
    raise exception 'Direct Item changes are disabled while submission review is active.' using errcode='55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['catalog_items','tracks','item_assets','catalog_offers','offer_entitlements','item_type_assignments','item_tag_assignments','item_capabilities','item_members','item_external_links','item_achievements'] loop
    execute format('drop trigger if exists review_live_write_fence on public.%I', table_name);
    execute format('create trigger review_live_write_fence before insert or update or delete on public.%I for each row execute function public.reject_live_item_mutation_during_review()', table_name);
  end loop;
end $$;

create or replace function public.snapshot_item_for_submission(target_submission_id uuid, target_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.item_submission_items
    (submission_id,item_id,item_category_id,slug,title,creator,item_type,price_cents,is_free,featured,tags,cover_url,hero_url,year,feature_description,launch_url,read_url,download_url,author_id,short_description,long_description,market_mode,local_price_cents,local_currency,available_locally_only,experience_type,fulfillment_type,streaming_enabled,download_purchase_enabled,sort_order,merch_fulfillment_mode,merch_shipping_scope)
  select target_submission_id,i.id,i.item_category_id,i.slug,i.title,i.creator,i.item_type,i.price_cents,i.is_free,i.featured,i.tags,i.cover_url,i.hero_url,i.year,i.feature_description,i.launch_url,i.read_url,i.download_url,i.author_id,i.short_description,i.long_description,i.market_mode,i.local_price_cents,i.local_currency,i.available_locally_only,i.experience_type,i.fulfillment_type,i.streaming_enabled,i.download_purchase_enabled,i.sort_order,i.merch_fulfillment_mode,i.merch_shipping_scope from public.catalog_items i where i.id=target_item_id;
  insert into public.item_submission_tracks select target_submission_id, t.id, t.number, t.title, t.duration_seconds, t.audio_url, t.download_url from public.tracks t where t.item_id=target_item_id;
  insert into public.item_submission_assets select target_submission_id, a.id, a.asset_type, a.title, a.file_url, a.storage_path, a.is_downloadable, a.sort_order from public.item_assets a where a.item_id=target_item_id;
  insert into public.item_submission_offers select target_submission_id, o.id, o.code, o.offer_type, o.title, o.description, o.price_cents, o.currency, o.status, o.fulfillment_type, o.quantity_limit, o.starts_at, o.ends_at from public.catalog_offers o where o.item_id=target_item_id;
  insert into public.item_submission_offer_entitlements select target_submission_id, oe.offer_id, oe.entitlement_type from public.offer_entitlements oe join public.catalog_offers o on o.id=oe.offer_id where o.item_id=target_item_id;
  insert into public.item_submission_type_assignments select target_submission_id, a.item_type_id from public.item_type_assignments a where a.item_id=target_item_id;
  insert into public.item_submission_tag_assignments select target_submission_id, a.item_tag_id from public.item_tag_assignments a where a.item_id=target_item_id;
  insert into public.item_submission_capabilities select target_submission_id, c.capability_key, c.config_version, c.is_enabled from public.item_capabilities c where c.item_id=target_item_id;
  insert into public.item_submission_members select target_submission_id, m.profile_id, m.member_role from public.item_members m where m.item_id=target_item_id;
  insert into public.item_submission_external_links select target_submission_id, l.id, l.platform, l.label, l.url, l.sort_order from public.item_external_links l where l.item_id=target_item_id;
  insert into public.item_submission_achievements select target_submission_id, a.id, a.code, a.title, a.description, a.trigger_type, a.reward_item_id, a.sort_order, a.is_secret, a.trigger_config, a.reward_config, a.points, a.icon, a.template_id from public.item_achievements a where a.item_id=target_item_id;
end;
$$;

create or replace function public.submit_item_for_review(target_item_id uuid, target_idempotency_key text, target_policy_version text default '2026-07-13-review-v1')
returns uuid language plpgsql security definer set search_path=public as $$
declare existing_id uuid; new_submission_id uuid; item_row public.catalog_items;
begin
  if not public.publishing_review_is_required() then raise exception 'Submission review is not active.' using errcode='55000'; end if;
  if nullif(btrim(target_idempotency_key),'') is null then raise exception 'An idempotency key is required.' using errcode='22023'; end if;
  select id into existing_id from public.item_submissions where submitter_id=auth.uid() and idempotency_key=target_idempotency_key;
  if existing_id is not null then return existing_id; end if;
  select * into item_row from public.catalog_items where id=target_item_id and (public.is_platform_admin() or author_id=auth.uid());
  if not found or item_row.status='archived' or not public.is_approved_publisher(auth.uid()) then raise exception 'Item not found or not owned by an approved creator.' using errcode='42501'; end if;
  if exists(select 1 from public.item_submissions where item_id=target_item_id and status='pending') then raise exception 'This Item already has a pending submission.' using errcode='23505'; end if;
  insert into public.item_submissions(item_id,submitter_id,submission_kind,policy_version,idempotency_key)
    values(target_item_id,auth.uid(),case when item_row.status='published' then 'revision' else 'create' end,target_policy_version,target_idempotency_key)
    returning id into new_submission_id;
  perform public.snapshot_item_for_submission(new_submission_id,target_item_id);
  insert into public.item_submission_notification_events(submission_id,recipient_id,event_type,payload)
    values(new_submission_id,null,'submitted',jsonb_build_object('item_id',target_item_id,'policy_version',target_policy_version))
    on conflict (submission_id,event_type) where recipient_id is null do nothing;
  return new_submission_id;
end;
$$;

create or replace function public.withdraw_item_submission(target_submission_id uuid, reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.publishing_review_is_required() then raise exception 'Submission review is not active.' using errcode='55000'; end if;
  update public.item_submissions set status='withdrawn', withdrawn_at=now(), withdrawal_reason=nullif(btrim(reason),'')
  where id=target_submission_id and submitter_id=auth.uid() and status='pending';
  if not found then raise exception 'Submission not found or no longer pending.' using errcode='55000'; end if;
  perform public.record_item_submission_event(target_submission_id,'withdrawn',auth.uid(),jsonb_build_object('reason',nullif(btrim(reason),'')));
end;
$$;

create or replace function public.add_item_submission_child_tombstone(target_submission_id uuid, target_child_type text, target_source_id uuid, reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.publishing_review_is_required() then raise exception 'Submission review is not active.' using errcode='55000'; end if;
  if target_child_type not in ('track','asset','offer','offer_entitlement','type_assignment','tag_assignment','capability','member','external_link','achievement') or target_source_id is null or nullif(btrim(reason),'') is null then raise exception 'Invalid child removal proposal.' using errcode='22023'; end if;
  if not exists(select 1 from public.item_submissions where id=target_submission_id and submitter_id=auth.uid() and status='pending') then raise exception 'Submission not found or no longer pending.' using errcode='55000'; end if;
  insert into public.item_submission_child_tombstones(submission_id,child_type,source_id,reason) values(target_submission_id,target_child_type,target_source_id,btrim(reason)) on conflict do nothing;
end;
$$;

create or replace function public.decide_item_submission(target_submission_id uuid, target_decision text, reason text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.item_submissions; snap public.item_submission_items;
begin
  if not public.is_platform_admin() then raise exception 'Administrator approval is required.' using errcode='42501'; end if;
  if target_decision not in ('approved','rejected') or nullif(btrim(reason),'') is null then raise exception 'A valid decision and reason are required.' using errcode='22023'; end if;
  select * into s from public.item_submissions where id=target_submission_id for update;
  if not found or s.status <> 'pending' then raise exception 'Submission is not pending.' using errcode='55000'; end if;
  if target_decision='rejected' then
    insert into public.item_submission_decisions(submission_id,decision,reviewer_id,policy_version,reason) values(s.id,'rejected',auth.uid(),s.policy_version,btrim(reason));
    update public.item_submissions set status='rejected',decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(reason) where id=s.id;
    perform public.record_item_submission_event(s.id,'rejected',s.submitter_id,jsonb_build_object('reason',btrim(reason),'policy_version',s.policy_version));
    return;
  end if;
  perform set_config('os44.review_apply','1',true);
  select * into snap from public.item_submission_items where submission_id=s.id;
  if not found then raise exception 'Submission snapshot is incomplete.' using errcode='23514'; end if;
  update public.catalog_items set item_category_id=snap.item_category_id,slug=snap.slug,title=snap.title,creator=snap.creator,item_type=snap.item_type,price_cents=snap.price_cents,is_free=snap.is_free,featured=snap.featured,tags=snap.tags,cover_url=snap.cover_url,hero_url=snap.hero_url,year=snap.year,feature_description=snap.feature_description,launch_url=snap.launch_url,read_url=snap.read_url,download_url=snap.download_url,short_description=snap.short_description,long_description=snap.long_description,market_mode=snap.market_mode,local_price_cents=snap.local_price_cents,local_currency=snap.local_currency,available_locally_only=snap.available_locally_only,experience_type=snap.experience_type,fulfillment_type=snap.fulfillment_type,streaming_enabled=snap.streaming_enabled,download_purchase_enabled=snap.download_purchase_enabled,sort_order=snap.sort_order,merch_fulfillment_mode=snap.merch_fulfillment_mode,merch_shipping_scope=snap.merch_shipping_scope,status='published',updated_at=now() where id=s.item_id and status <> 'archived';
  if not found then raise exception 'Item is missing or archived.' using errcode='55000'; end if;
  insert into public.tracks(id,item_id,number,title,duration_seconds,audio_url,download_url) select coalesce(source_id,gen_random_uuid()),s.item_id,number,title,duration_seconds,audio_url,download_url from public.item_submission_tracks where submission_id=s.id on conflict (id) do update set number=excluded.number,title=excluded.title,duration_seconds=excluded.duration_seconds,audio_url=excluded.audio_url,download_url=excluded.download_url;
  insert into public.item_assets(id,item_id,asset_type,title,file_url,storage_path,is_downloadable,sort_order) select coalesce(source_id,gen_random_uuid()),s.item_id,asset_type,title,file_url,storage_path,is_downloadable,sort_order from public.item_submission_assets where submission_id=s.id on conflict (id) do update set asset_type=excluded.asset_type,title=excluded.title,file_url=excluded.file_url,storage_path=excluded.storage_path,is_downloadable=excluded.is_downloadable,sort_order=excluded.sort_order;
  insert into public.catalog_offers(id,item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type,quantity_limit,starts_at,ends_at) select source_id,s.item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type,quantity_limit,starts_at,ends_at from public.item_submission_offers where submission_id=s.id on conflict (id) do update set code=excluded.code,title=excluded.title,description=excluded.description,price_cents=excluded.price_cents,currency=excluded.currency,status=excluded.status,fulfillment_type=excluded.fulfillment_type,quantity_limit=excluded.quantity_limit,starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=now();
  insert into public.offer_entitlements(offer_id,entitlement_type) select offer_source_id,entitlement_type from public.item_submission_offer_entitlements where submission_id=s.id on conflict do nothing;
  insert into public.item_type_assignments(item_id,item_type_id) select s.item_id,item_type_id from public.item_submission_type_assignments where submission_id=s.id on conflict (item_id) do update set item_type_id=excluded.item_type_id;
  insert into public.item_tag_assignments(item_id,item_tag_id) select s.item_id,item_tag_id from public.item_submission_tag_assignments where submission_id=s.id on conflict do nothing;
  insert into public.item_capabilities(item_id,capability_key,config_version,is_enabled) select s.item_id,capability_key,config_version,is_enabled from public.item_submission_capabilities where submission_id=s.id on conflict (item_id,capability_key) do update set config_version=excluded.config_version,is_enabled=excluded.is_enabled,updated_at=now();
  insert into public.item_members(item_id,profile_id,member_role) select s.item_id,profile_id,member_role from public.item_submission_members where submission_id=s.id on conflict (item_id,profile_id) do update set member_role=excluded.member_role,updated_at=now();
  insert into public.item_external_links(id,item_id,platform,label,url,sort_order) select source_id,s.item_id,platform,label,url,sort_order from public.item_submission_external_links where submission_id=s.id on conflict (id) do update set platform=excluded.platform,label=excluded.label,url=excluded.url,sort_order=excluded.sort_order,updated_at=now();
  insert into public.item_achievements(id,item_id,code,title,description,trigger_type,reward_item_id,sort_order,is_secret,trigger_config,reward_config,points,icon,template_id) select source_id,s.item_id,code,title,description,trigger_type,reward_item_id,sort_order,is_secret,trigger_config,reward_config,points,icon,template_id from public.item_submission_achievements where submission_id=s.id on conflict (id) do update set code=excluded.code,title=excluded.title,description=excluded.description,trigger_type=excluded.trigger_type,reward_item_id=excluded.reward_item_id,sort_order=excluded.sort_order,is_secret=excluded.is_secret,trigger_config=excluded.trigger_config,reward_config=excluded.reward_config,points=excluded.points,icon=excluded.icon,template_id=excluded.template_id;
  insert into public.item_child_archives(item_id,child_type,child_id,archived_by,reason)
    select s.item_id,t.child_type,t.source_id,auth.uid(),t.reason from public.item_submission_child_tombstones t where t.submission_id=s.id on conflict do nothing;
  insert into public.item_submission_decisions(submission_id,decision,reviewer_id,policy_version,reason) values(s.id,'approved',auth.uid(),s.policy_version,btrim(reason));
  update public.item_submissions set status='approved',decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(reason) where id=s.id;
  perform public.record_item_submission_event(s.id,'approved',s.submitter_id,jsonb_build_object('reason',btrim(reason),'policy_version',s.policy_version));
end;
$$;

revoke all on function public.snapshot_item_for_submission(uuid,uuid) from public,anon,authenticated;
revoke all on function public.record_item_submission_event(uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.submit_item_for_review(uuid,text,text) from public,anon;
revoke all on function public.withdraw_item_submission(uuid,text) from public,anon;
revoke all on function public.add_item_submission_child_tombstone(uuid,text,uuid,text) from public,anon;
revoke all on function public.decide_item_submission(uuid,text,text) from public,anon;
grant execute on function public.submit_item_for_review(uuid,text,text),public.withdraw_item_submission(uuid,text) to authenticated;
grant execute on function public.add_item_submission_child_tombstone(uuid,text,uuid,text) to authenticated;
grant execute on function public.decide_item_submission(uuid,text,text) to authenticated;
grant execute on function public.snapshot_item_for_submission(uuid,uuid) to service_role;

alter table public.item_submissions enable row level security;
alter table public.item_submission_decisions enable row level security;
alter table public.item_submission_child_tombstones enable row level security;
alter table public.item_submission_notification_events enable row level security;
alter table public.item_child_archives enable row level security;
alter table public.item_submission_items enable row level security;
alter table public.item_submission_tracks enable row level security;
alter table public.item_submission_assets enable row level security;
alter table public.item_submission_offers enable row level security;
alter table public.item_submission_offer_entitlements enable row level security;
alter table public.item_submission_type_assignments enable row level security;
alter table public.item_submission_tag_assignments enable row level security;
alter table public.item_submission_capabilities enable row level security;
alter table public.item_submission_members enable row level security;
alter table public.item_submission_external_links enable row level security;
alter table public.item_submission_achievements enable row level security;

create policy item_submissions_owner_read on public.item_submissions for select to authenticated using (submitter_id=auth.uid() or public.is_platform_admin());
create policy item_submission_decisions_owner_read on public.item_submission_decisions for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_tombstones_owner_read on public.item_submission_child_tombstones for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_notification_events_owner_read on public.item_submission_notification_events for select to authenticated using (recipient_id=auth.uid() or (recipient_id is null and public.is_platform_admin()));
create policy item_child_archives_owner_read on public.item_child_archives for select to authenticated using (public.can_manage_item(item_id) or public.is_platform_admin());
create policy item_submission_children_owner_read on public.item_submission_items for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_tracks_owner_read on public.item_submission_tracks for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_assets_owner_read on public.item_submission_assets for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_offers_owner_read on public.item_submission_offers for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_offer_entitlements_owner_read on public.item_submission_offer_entitlements for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_type_assignments_owner_read on public.item_submission_type_assignments for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_tag_assignments_owner_read on public.item_submission_tag_assignments for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_capabilities_owner_read on public.item_submission_capabilities for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_members_owner_read on public.item_submission_members for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_external_links_owner_read on public.item_submission_external_links for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));
create policy item_submission_achievements_owner_read on public.item_submission_achievements for select to authenticated using (exists(select 1 from public.item_submissions s where s.id=submission_id and (s.submitter_id=auth.uid() or public.is_platform_admin())));

revoke all on public.item_submissions,public.item_submission_decisions,public.item_submission_child_tombstones,public.item_submission_notification_events,public.item_child_archives,public.item_submission_items,public.item_submission_tracks,public.item_submission_assets,public.item_submission_offers,public.item_submission_offer_entitlements,public.item_submission_type_assignments,public.item_submission_tag_assignments,public.item_submission_capabilities,public.item_submission_members,public.item_submission_external_links,public.item_submission_achievements from authenticated;
grant select on public.item_submissions,public.item_submission_decisions,public.item_submission_child_tombstones,public.item_submission_notification_events,public.item_child_archives,public.item_submission_items,public.item_submission_tracks,public.item_submission_assets,public.item_submission_offers,public.item_submission_offer_entitlements,public.item_submission_type_assignments,public.item_submission_tag_assignments,public.item_submission_capabilities,public.item_submission_members,public.item_submission_external_links,public.item_submission_achievements to authenticated;
grant all on public.item_submissions,public.item_submission_decisions,public.item_submission_child_tombstones,public.item_submission_notification_events,public.item_child_archives,public.item_submission_items,public.item_submission_tracks,public.item_submission_assets,public.item_submission_offers,public.item_submission_offer_entitlements,public.item_submission_type_assignments,public.item_submission_tag_assignments,public.item_submission_capabilities,public.item_submission_members,public.item_submission_external_links,public.item_submission_achievements to service_role;

comment on table public.item_submissions is 'Server-authoritative creator Item submissions. Pending revisions never replace the last approved Item version.';
comment on table public.item_submission_decisions is 'Append-only administrator decision audit for creator Item submissions.';
comment on table public.item_submission_child_tombstones is 'Typed proposed child removals; approval semantics are applied by the review service and preserve historical identities.';
comment on table public.item_submission_notification_events is 'Transactional notification outbox metadata only; no delivery is activated by this foundation.';
comment on table public.item_child_archives is 'Preserves child row identity while recording server-authoritative archival of a proposed removal.';
comment on table public.item_submission_items is 'Typed proposed Item fields keyed to the permanent catalog_items identity.';
