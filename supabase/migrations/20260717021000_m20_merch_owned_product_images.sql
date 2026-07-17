begin;

-- Printful remains fulfillment truth only. Customer-facing Merch imagery is
-- uploaded and curated by forty four inside 44OS.
update public.merch_variants set image_url=null where image_url is not null;
update public.printful_product_mappings set thumbnail_url=null where thumbnail_url is not null;

create table public.merch_product_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  role text not null check (role in ('main','color','bonus')),
  color_value text,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  file_url text not null check (file_url ~ '^https?://'),
  storage_path text not null unique check (storage_path ~ '^merch/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role='color' and color_value is not null and char_length(btrim(color_value)) between 1 and 80)
    or (role in ('main','bonus') and color_value is null)
  )
);

create unique index merch_product_images_one_main_idx
  on public.merch_product_images(item_id)
  where role='main';

create unique index merch_product_images_one_per_color_idx
  on public.merch_product_images(item_id,lower(btrim(color_value)))
  where role='color';

create index merch_product_images_public_order_idx
  on public.merch_product_images(item_id,role,sort_order,id);

create or replace function public.validate_merch_product_image()
returns trigger language plpgsql set search_path=public as $$
declare item_row public.catalog_items;
declare platform_seller uuid;
begin
  select * into item_row from public.catalog_items where id=new.item_id;
  select platform_seller_id into platform_seller
  from public.commerce_runtime_controls where singleton;

  if item_row.id is null
     or item_row.experience_type<>'merch'
     or item_row.fulfillment_type not in ('physical','hybrid')
     or platform_seller is null
     or item_row.author_id is distinct from platform_seller then
    raise exception 'Merch imagery is restricted to forty four-owned physical Items.'
      using errcode='42501';
  end if;

  if new.role='color' and not exists (
    select 1 from public.merch_variants variant
    where variant.item_id=new.item_id
      and lower(btrim(variant.option_values->>'color'))=lower(btrim(new.color_value))
  ) then
    raise exception 'The image color must match an imported canonical Merch color.'
      using errcode='23514';
  end if;

  return new;
end;
$$;

create trigger merch_product_images_validate
before insert or update on public.merch_product_images
for each row execute function public.validate_merch_product_image();

create trigger merch_product_images_touch
before update on public.merch_product_images
for each row execute function public.touch_content_updated_at();

create or replace function public.set_merch_product_image(
  target_item_id uuid,
  target_role text,
  target_color_value text,
  target_title text,
  target_file_url text,
  target_storage_path text,
  target_created_by uuid
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images;
declare resolved_id uuid;
declare next_order integer;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  if target_role not in ('main','color','bonus') then
    raise exception 'Invalid Merch image role.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_item_id::text,0));
  if target_role<>'bonus' then
    select * into existing
    from public.merch_product_images image
    where image.item_id=target_item_id
      and image.role=target_role
      and (
        (target_role='main' and image.color_value is null)
        or (target_role='color' and lower(btrim(image.color_value))=lower(btrim(target_color_value)))
      )
    for update;
  end if;

  if existing.id is not null then
    update public.merch_product_images set
      title=target_title,
      file_url=target_file_url,
      storage_path=target_storage_path,
      created_by=target_created_by
    where id=existing.id
    returning id into resolved_id;
  else
    select coalesce(max(sort_order),-1)+1 into next_order
    from public.merch_product_images where item_id=target_item_id;
    insert into public.merch_product_images(
      item_id,role,color_value,title,file_url,storage_path,sort_order,created_by
    ) values (
      target_item_id,target_role,
      case when target_role='color' then nullif(btrim(target_color_value),'') else null end,
      target_title,target_file_url,target_storage_path,next_order,target_created_by
    ) returning id into resolved_id;
  end if;

  if target_role='main' then
    update public.catalog_items set cover_url=target_file_url,updated_at=now()
    where id=target_item_id;
  elsif target_role='color' then
    update public.merch_variants set image_url=target_file_url
    where item_id=target_item_id
      and lower(btrim(option_values->>'color'))=lower(btrim(target_color_value));
  end if;

  return jsonb_build_object(
    'id',resolved_id,
    'replaced_storage_path',existing.storage_path
  );
end;
$$;

create or replace function public.delete_merch_product_image(
  target_image_id uuid
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare existing public.merch_product_images;
begin
  if auth.role()<>'service_role' then
    raise exception 'Service role required.' using errcode='42501';
  end if;
  select * into existing from public.merch_product_images
  where id=target_image_id for update;
  if existing.id is null then
    return jsonb_build_object('deleted',false,'storage_path',null);
  end if;

  delete from public.merch_product_images where id=existing.id;
  if existing.role='main' then
    update public.catalog_items set cover_url=null,updated_at=now()
    where id=existing.item_id and cover_url=existing.file_url;
  elsif existing.role='color' then
    update public.merch_variants set image_url=null
    where item_id=existing.item_id
      and image_url=existing.file_url
      and lower(btrim(option_values->>'color'))=lower(btrim(existing.color_value));
  end if;
  return jsonb_build_object('deleted',true,'storage_path',existing.storage_path);
end;
$$;

alter table public.merch_product_images enable row level security;

create policy merch_product_images_published_read
on public.merch_product_images for select to anon, authenticated
using (
  exists (
    select 1 from public.catalog_items item
    where item.id=merch_product_images.item_id
      and item.status='published'
      and item.experience_type='merch'
      and item.fulfillment_type in ('physical','hybrid')
  )
);

revoke all on public.merch_product_images from anon,authenticated;
grant select on public.merch_product_images to anon,authenticated;
grant all on public.merch_product_images to service_role;
revoke all on function public.set_merch_product_image(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.delete_merch_product_image(uuid) from public,anon,authenticated;
grant execute on function public.set_merch_product_image(uuid,text,text,text,text,text,uuid) to service_role;
grant execute on function public.delete_merch_product_image(uuid) to service_role;

comment on table public.merch_product_images is
  '44OS-owned public Merch images: one main image, one image per imported color, and ordered bonus gallery images. Printful image URLs never populate this table.';

commit;
