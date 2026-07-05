-- Product display ordering for Store and Dashboard.

alter table public.products
  add column if not exists sort_order bigint;

with ordered_products as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as next_sort_order
  from public.products
)
update public.products p
set sort_order = ordered_products.next_sort_order
from ordered_products
where p.id = ordered_products.id
  and p.sort_order is null;

create index if not exists products_sort_order_idx
on public.products (sort_order desc, created_at desc);
