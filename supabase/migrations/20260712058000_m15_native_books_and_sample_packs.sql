-- M15: native PDF books and sample-pack contracts.
-- Protected originals remain in item-files. Public previews are separate,
-- explicitly non-downloadable records and never confer owned access.

alter table public.item_assets drop constraint if exists item_assets_asset_type_check;
alter table public.item_assets add constraint item_assets_asset_type_check check (
  asset_type = any (array[
    'audio','book','book_preview','sample_pack','sample','sample_preview',
    'gallery_image','bonus_content','bonus_achievement','commentary_audio',
    'behind_the_scenes','image','webgl','template','music','merch','other'
  ]::text[])
);

create table public.book_contents (
  item_id uuid primary key references public.catalog_items(id) on delete cascade,
  file_asset_id uuid not null unique references public.item_assets(id) on delete restrict,
  preview_url text,
  format text not null default 'pdf' check (format = 'pdf'),
  total_pages integer check (total_pages is null or total_pages > 0),
  sample_page_limit integer check (sample_page_limit is null or sample_page_limit > 0),
  language_code text check (language_code is null or language_code ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.book_contents is
  'One PDF reader contract per book Item. preview_url is a creator-supplied public sample PDF; file_asset_id points to the protected full PDF.';

create table public.sample_pack_files (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  source_asset_id uuid unique references public.item_assets(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 180),
  preview_url text,
  duration_seconds numeric(12,3) check (duration_seconds is null or duration_seconds > 0),
  waveform_peaks jsonb not null default '[]'::jsonb check (jsonb_typeof(waveform_peaks) = 'array'),
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, sort_order)
);

comment on table public.sample_pack_files is
  'Public preview metadata and optional protected individual-sample asset linkage. Full-pack delivery remains an item_assets sample_pack row.';

create table public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  page_number integer not null default 1 check (page_number > 0),
  total_pages integer check (total_pages is null or total_pages > 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  appearance jsonb not null default '{"theme":"system","fit":"width","zoom":1}'::jsonb check (jsonb_typeof(appearance) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.sample_playback_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  sample_file_id uuid not null references public.sample_pack_files(id) on delete cascade,
  position_seconds numeric(12,3) not null default 0 check (position_seconds >= 0),
  duration_seconds numeric(12,3) check (duration_seconds is null or duration_seconds > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, sample_file_id)
);

create index sample_pack_files_item_order_idx on public.sample_pack_files(item_id, sort_order);
create index reading_progress_user_updated_idx on public.reading_progress(user_id, updated_at desc);
create index sample_playback_progress_user_updated_idx on public.sample_playback_progress(user_id, updated_at desc);

create trigger book_contents_touch_updated_at before update on public.book_contents
for each row execute function public.touch_content_updated_at();
create trigger sample_pack_files_touch_updated_at before update on public.sample_pack_files
for each row execute function public.touch_content_updated_at();

create or replace function public.validate_m15_book_content()
returns trigger language plpgsql set search_path = public as $$
declare item_kind text;
declare asset_row public.item_assets;
begin
  select experience_type into item_kind from public.catalog_items where id = new.item_id;
  if item_kind <> 'book' then raise exception 'Book content requires a book Item.' using errcode='23514'; end if;
  select * into asset_row from public.item_assets where id = new.file_asset_id;
  if asset_row.id is null or asset_row.item_id <> new.item_id or asset_row.asset_type <> 'book'
    or asset_row.storage_path is null or asset_row.file_url is not null then
    raise exception 'Book content requires this Item''s protected book asset.' using errcode='23514';
  end if;
  if new.preview_url is not null and new.preview_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Book preview must be a valid HTTPS URL.' using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger validate_m15_book_content before insert or update on public.book_contents
for each row execute function public.validate_m15_book_content();

create or replace function public.validate_m15_sample_file()
returns trigger language plpgsql set search_path = public as $$
declare item_kind text;
declare asset_row public.item_assets;
begin
  select experience_type into item_kind from public.catalog_items where id = new.item_id;
  if item_kind <> 'asset' then raise exception 'Sample files require an asset Item.' using errcode='23514'; end if;
  if new.preview_url is not null and new.preview_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Sample preview must be a valid HTTPS URL.' using errcode='23514';
  end if;
  if new.source_asset_id is not null then
    select * into asset_row from public.item_assets where id = new.source_asset_id;
    if asset_row.id is null or asset_row.item_id <> new.item_id or asset_row.asset_type <> 'sample'
      or asset_row.storage_path is null or asset_row.file_url is not null or not asset_row.is_downloadable then
      raise exception 'Individual downloads require this Item''s protected sample asset.' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_m15_sample_file before insert or update on public.sample_pack_files
for each row execute function public.validate_m15_sample_file();

-- Every existing protected PDF receives a reader contract without changing its
-- Item, asset, storage path, or Library relationships. Samples remain optional.
insert into public.book_contents(item_id,file_asset_id,format)
select item.id,asset.id,'pdf'
from public.catalog_items item
join lateral (
  select candidate.id from public.item_assets candidate
  where candidate.item_id=item.id and candidate.asset_type='book' and candidate.storage_path is not null
  order by candidate.sort_order,candidate.created_at limit 1
) asset on true
where item.experience_type='book'
on conflict(item_id) do nothing;

insert into public.item_capabilities(item_id,capability_key,is_enabled)
select id,case experience_type when 'book' then 'reader' else 'sample_preview' end,true
from public.catalog_items where experience_type in ('book','asset')
on conflict(item_id,capability_key) do update set is_enabled=true,updated_at=now();

create or replace function public.sync_m15_native_capability()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_item uuid:=coalesce(new.item_id,old.item_id); target_key text:=case when tg_table_name='book_contents' then 'reader' else 'sample_preview' end;
begin
  insert into public.item_capabilities(item_id,capability_key,is_enabled)
  values(target_item,target_key,exists(select 1 from public.book_contents where item_id=target_item) or exists(select 1 from public.sample_pack_files where item_id=target_item))
  on conflict(item_id,capability_key) do update set is_enabled=excluded.is_enabled,updated_at=now();
  return coalesce(new,old);
end;
$$;
create trigger book_contents_sync_native_capability after insert or update or delete on public.book_contents
for each row execute function public.sync_m15_native_capability();
create trigger sample_pack_files_sync_native_capability after insert or update or delete on public.sample_pack_files
for each row execute function public.sync_m15_native_capability();

alter table public.book_contents enable row level security;
alter table public.sample_pack_files enable row level security;
alter table public.reading_progress enable row level security;
alter table public.sample_playback_progress enable row level security;

create policy book_contents_public_or_manager_read on public.book_contents for select
using (
  exists(select 1 from public.catalog_items item where item.id=item_id and item.status='published')
  or public.can_manage_item(item_id)
);
create policy book_contents_manager_write on public.book_contents for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

create policy sample_pack_files_public_or_manager_read on public.sample_pack_files for select
using (
  exists(select 1 from public.catalog_items item where item.id=item_id and item.status='published')
  or public.can_manage_item(item_id)
);
create policy sample_pack_files_manager_write on public.sample_pack_files for all to authenticated
using (public.can_manage_item(item_id)) with check (public.can_manage_item(item_id));

create policy reading_progress_owner_read on public.reading_progress for select to authenticated
using (user_id=auth.uid());
create policy sample_playback_progress_owner_read on public.sample_playback_progress for select to authenticated
using (user_id=auth.uid());

revoke insert,update,delete on public.reading_progress,public.sample_playback_progress from anon,authenticated;
grant select on public.book_contents,public.sample_pack_files to anon,authenticated;
grant insert,update,delete on public.book_contents,public.sample_pack_files to authenticated;
grant select on public.reading_progress,public.sample_playback_progress to authenticated;
grant all on public.book_contents,public.sample_pack_files,public.reading_progress,public.sample_playback_progress to service_role;

create or replace function public.can_access_item_file(object_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.item_assets asset
    where asset.storage_path=object_name and (
      public.can_manage_item(asset.item_id)
      or (asset.asset_type in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content'))
      or (asset.asset_type='book' and public.has_item_entitlement(auth.uid(),asset.item_id,'read'))
      or (asset.asset_type in ('sample_pack','sample') and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (asset.is_downloadable and public.has_item_entitlement(auth.uid(),asset.item_id,'download'))
      or (not asset.is_downloadable and asset.asset_type not in ('bonus_content','bonus_achievement') and public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
    )
  );
$$;

create or replace function public.list_item_asset_manifest(target_item_id uuid)
returns table(id uuid,item_id uuid,asset_type text,title text,file_url text,storage_path text,
  is_downloadable boolean,sort_order integer,created_at timestamptz,is_unlocked boolean)
language sql stable security definer set search_path=public as $$
  select asset.id,asset.item_id,asset.asset_type,asset.title,
    case when access.can_access then asset.file_url else null end,
    case when access.can_access then asset.storage_path else null end,
    asset.is_downloadable,asset.sort_order,asset.created_at,access.can_access
  from public.item_assets asset
  cross join lateral (
    select case
      when public.can_manage_item(asset.item_id) then true
      when asset.asset_type in ('bonus_content','bonus_achievement') then public.has_item_entitlement(auth.uid(),asset.item_id,'bonus_content')
      when asset.asset_type='book' then public.has_item_entitlement(auth.uid(),asset.item_id,'read')
      when asset.asset_type in ('sample_pack','sample') then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
      when asset.is_downloadable then public.has_item_entitlement(auth.uid(),asset.item_id,'download')
      else public.has_item_entitlement(auth.uid(),asset.item_id,'library_access')
    end as can_access
  ) access
  where asset.item_id=target_item_id
    and (public.can_manage_item(asset.item_id) or public.has_item_entitlement(auth.uid(),asset.item_id,'library_access'))
  order by asset.sort_order,asset.created_at;
$$;

create or replace function public.save_reading_progress(target_item_id uuid,target_page integer,target_total_pages integer,target_appearance jsonb default null)
returns public.reading_progress language plpgsql security definer set search_path=public as $$
declare active_user uuid:=auth.uid(); result public.reading_progress; safe_total integer; safe_page integer; safe_appearance jsonb;
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not public.has_item_entitlement(active_user,target_item_id,'read') and not public.can_manage_item(target_item_id) then
    raise exception 'active read access required' using errcode='42501';
  end if;
  safe_total:=case when target_total_pages is null or target_total_pages<1 then null else target_total_pages end;
  safe_page:=greatest(1,case when safe_total is null then target_page else least(target_page,safe_total) end);
  safe_appearance:=coalesce(target_appearance,'{}'::jsonb);
  if jsonb_typeof(safe_appearance)<>'object'
    or coalesce(safe_appearance->>'theme','system') not in ('system','light','dark','sepia')
    or coalesce(safe_appearance->>'fit','width') not in ('width','page') then
    raise exception 'invalid reader appearance' using errcode='22023';
  end if;
  insert into public.reading_progress(user_id,item_id,page_number,total_pages,progress_percent,appearance,updated_at)
  values(active_user,target_item_id,safe_page,safe_total,
    case when safe_total is null then 0 else round((safe_page::numeric/safe_total::numeric)*100,2) end,
    safe_appearance,now())
  on conflict(user_id,item_id) do update set page_number=excluded.page_number,total_pages=excluded.total_pages,
    progress_percent=excluded.progress_percent,appearance=excluded.appearance,updated_at=now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.save_sample_playback_progress(target_sample_file_id uuid,target_position_seconds numeric,target_duration_seconds numeric default null)
returns public.sample_playback_progress language plpgsql security definer set search_path=public as $$
declare active_user uuid:=auth.uid(); sample_row public.sample_pack_files; result public.sample_playback_progress; safe_duration numeric; safe_position numeric;
begin
  if active_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into sample_row from public.sample_pack_files file join public.catalog_items item on item.id=file.item_id
  where file.id=target_sample_file_id and (item.status='published' or public.can_manage_item(file.item_id));
  if sample_row.id is null then raise exception 'sample preview not found' using errcode='P0002'; end if;
  safe_duration:=case when target_duration_seconds is null or target_duration_seconds<=0 then sample_row.duration_seconds else target_duration_seconds end;
  safe_position:=greatest(0,case when safe_duration is null then target_position_seconds else least(target_position_seconds,safe_duration) end);
  insert into public.sample_playback_progress(user_id,item_id,sample_file_id,position_seconds,duration_seconds,updated_at)
  values(active_user,sample_row.item_id,sample_row.id,safe_position,safe_duration,now())
  on conflict(user_id,sample_file_id) do update set position_seconds=excluded.position_seconds,duration_seconds=excluded.duration_seconds,updated_at=now()
  returning * into result;
  return result;
end;
$$;

-- Free book saves receive read access and free sample-pack saves receive the
-- download access needed for full-pack and optional individual re-downloads.
insert into public.offer_entitlements(offer_id,entitlement_type)
select offer.id,case item.experience_type when 'book' then 'read' else 'download' end
from public.catalog_offers offer join public.catalog_items item on item.id=offer.item_id
where offer.code='library-access' and offer.status='active' and item.experience_type in ('book','asset')
on conflict do nothing;

create or replace function public.sync_default_library_offer()
returns trigger language plpgsql security definer set search_path=public as $$
declare offer_id uuid;
begin
  if new.status='published' and (new.is_free or new.price_cents=0 or (new.experience_type='music' and new.streaming_enabled)) then
    insert into public.catalog_offers(item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type)
    values(new.id,'library-access','library_access','Add to Library','Save this Item to your 44OS Library.',0,'USD','active','entitlement')
    on conflict(item_id,code) do update set status='active',price_cents=0
    returning id into offer_id;
    insert into public.offer_entitlements(offer_id,entitlement_type) values(offer_id,'library_access') on conflict do nothing;
    if new.experience_type='book' then
      insert into public.offer_entitlements(offer_id,entitlement_type) values(offer_id,'read') on conflict do nothing;
    elsif new.experience_type='asset' then
      insert into public.offer_entitlements(offer_id,entitlement_type) values(offer_id,'download') on conflict do nothing;
    end if;
  else
    update public.catalog_offers set status='archived' where item_id=new.id and code='library-access';
  end if;
  return new;
end;
$$;

create or replace function public.save_item_to_library(target_item_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare active_user uuid:=auth.uid(); offer_row public.catalog_offers; entitlement_row public.entitlements; entitlement_kind text; previous_status text; library_id uuid;
begin
  if active_user is null then raise exception 'authentication required'; end if;
  select offer.* into offer_row from public.catalog_offers offer join public.catalog_items item on item.id=offer.item_id
  where offer.item_id=target_item_id and offer.offer_type='library_access' and offer.status='active' and offer.price_cents=0
    and item.status='published' and (offer.starts_at is null or offer.starts_at<=now()) and (offer.ends_at is null or offer.ends_at>now())
  order by offer.created_at limit 1;
  if offer_row.id is null then raise exception 'free Library access is not available for this Item'; end if;
  for entitlement_kind in select oe.entitlement_type from public.offer_entitlements oe where oe.offer_id=offer_row.id loop
    select * into entitlement_row from public.entitlements where user_id=active_user and item_id=target_item_id and entitlement_type=entitlement_kind;
    previous_status:=entitlement_row.status;
    insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at,revoked_at)
    values(active_user,target_item_id,entitlement_kind,'active','free_offer',offer_row.id,now(),null)
    on conflict(user_id,item_id,entitlement_type) do update set status='active',source_type='free_offer',source_id=offer_row.id,
      granted_at=case when public.entitlements.status='active' then public.entitlements.granted_at else now() end,revoked_at=null,expires_at=null
    returning * into entitlement_row;
    if previous_status is distinct from 'active' then
      insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,actor_id,reason)
      values(entitlement_row.id,active_user,target_item_id,entitlement_kind,case when previous_status is null then 'grant' else 'restore' end,
        'free_offer',offer_row.id,active_user,'Free Library save');
    end if;
  end loop;
  insert into public.library_entries(user_id,item_id,acquisition_type,status,acquired_at)
  values(active_user,target_item_id,'free','visible',now())
  on conflict(user_id,item_id) do update set status='visible',acquisition_type=case when public.library_entries.acquisition_type in ('paid','purchase','grant') then public.library_entries.acquisition_type else 'free' end
  returning id into library_id;
  return library_id;
end;
$$;

-- Preserve access for every existing Library relationship without altering it.
insert into public.entitlements(user_id,item_id,entitlement_type,status,source_type,source_id,granted_at)
select entry.user_id,entry.item_id,case item.experience_type when 'book' then 'read' else 'download' end,
  'active','legacy_library',entry.id,entry.acquired_at
from public.library_entries entry join public.catalog_items item on item.id=entry.item_id
where item.experience_type in ('book','asset')
on conflict(user_id,item_id,entitlement_type) do nothing;

insert into public.entitlement_events(entitlement_id,user_id,item_id,entitlement_type,operation,source_type,source_id,reason)
select entitlement.id,entitlement.user_id,entitlement.item_id,entitlement.entitlement_type,'grant',entitlement.source_type,entitlement.source_id,'M15 existing Library access preservation'
from public.entitlements entitlement
where entitlement.source_type='legacy_library' and entitlement.entitlement_type in ('read','download')
  and not exists(select 1 from public.entitlement_events event where event.entitlement_id=entitlement.id and event.entitlement_type=entitlement.entitlement_type);

grant execute on function public.save_reading_progress(uuid,integer,integer,jsonb) to authenticated,service_role;
grant execute on function public.save_sample_playback_progress(uuid,numeric,numeric) to authenticated,service_role;
revoke execute on function public.save_reading_progress(uuid,integer,integer,jsonb) from public,anon;
revoke execute on function public.save_sample_playback_progress(uuid,numeric,numeric) from public,anon;
revoke execute on function public.validate_m15_book_content(),public.validate_m15_sample_file() from public,anon,authenticated;
revoke execute on function public.sync_m15_native_capability() from public,anon,authenticated;

comment on function public.save_reading_progress(uuid,integer,integer,jsonb) is 'Saves clamped PDF reading progress and appearance only while active read access exists.';
comment on function public.save_sample_playback_progress(uuid,numeric,numeric) is 'Saves clamped preview playback progress for an authenticated user and a published sample.';
