alter table public.catalog_items
  add column if not exists release_date date;

update public.catalog_items
set release_date = make_date(year, 1, 1)
where release_date is null
  and year between 1 and 9999;

create index if not exists catalog_items_release_date_idx
  on public.catalog_items (release_date desc);
