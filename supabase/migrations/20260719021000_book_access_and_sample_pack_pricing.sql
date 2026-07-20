-- Books remain free to read and save while optionally offering a paid PDF.
-- Newly published or edited Sample Packs must be paid downloadable Items.

create or replace function public.sync_default_library_offer()
returns trigger language plpgsql security definer set search_path=public as $$
declare offer_id uuid;
begin
  if new.status='published' and (
    new.is_free
    or new.price_cents=0
    or new.experience_type='book'
    or (new.experience_type='music' and new.streaming_enabled)
  ) then
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

insert into public.catalog_offers(item_id,code,offer_type,title,description,price_cents,currency,status,fulfillment_type)
select item.id,'library-access','library_access','Add to Library','Save this Item to your 44OS Library.',0,'USD','active','entitlement'
from public.catalog_items item
where item.status='published' and item.experience_type='book'
on conflict(item_id,code) do update set status='active',price_cents=0;

insert into public.offer_entitlements(offer_id,entitlement_type)
select offer.id,entitlement_type
from public.catalog_offers offer
join public.catalog_items item on item.id=offer.item_id
cross join(values('library_access'::text),('read'::text)) required(entitlement_type)
where offer.code='library-access' and offer.status='active' and item.status='published' and item.experience_type='book'
on conflict do nothing;

create or replace function public.enforce_paid_sample_pack()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='published' and new.experience_type='asset' and (
    new.is_free
    or new.price_cents<=0
    or not new.download_purchase_enabled
  ) then
    raise exception 'Published Sample Packs require a paid download price.' using errcode='23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_paid_sample_pack() from public,anon,authenticated;

drop trigger if exists catalog_items_enforce_paid_sample_pack on public.catalog_items;
create trigger catalog_items_enforce_paid_sample_pack
before insert or update of status,experience_type,price_cents,is_free,download_purchase_enabled
on public.catalog_items
for each row execute function public.enforce_paid_sample_pack();

comment on function public.enforce_paid_sample_pack() is
  'Prevents new or edited Sample Packs from publishing without an enabled paid download and positive price; existing published free packs are grandfathered until edited.';
