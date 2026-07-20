begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into public.catalog_items(id,slug,title,creator,item_type,cover_url,status,experience_type,fulfillment_type,release_date)
values('98800000-0000-0000-0000-000000000001','release-date-health','Release Date Health','Metadata Creator','Single','https://example.test/release.jpg','draft','music','digital',null);

select ok(
  exists(select 1 from public.catalog_item_health('98800000-0000-0000-0000-000000000001') where code='missing_release_date'),
  'Music without a Release Date is not publication-ready'
);

update public.catalog_items set release_date='2026-07-19',year=2026 where id='98800000-0000-0000-0000-000000000001';
select ok(
  not exists(select 1 from public.catalog_item_health('98800000-0000-0000-0000-000000000001') where code='missing_release_date'),
  'Music with a valid Release Date clears that publication issue'
);

select * from finish();
rollback;
