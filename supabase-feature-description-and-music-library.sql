-- Run this on an existing clean 44 Platform database if you do not want to reset data.
-- It adds optional hero copy fields and lets signed-in testers add music products
-- to their Library even before checkout is built.

alter table public.products
  add column if not exists feature_description text;

alter table public.services
  add column if not exists feature_description text;

drop policy if exists "Users can add free products to library" on public.library_items;
drop policy if exists "Users can add free or music products to library" on public.library_items;

create policy "Users can add free or music products to library"
on public.library_items
for insert to authenticated
with check (
  auth.uid() = user_id
  and acquisition_type in ('free', 'grant')
  and exists (
    select 1 from public.products
    where products.id = library_items.product_id
      and (products.is_free = true or lower(products.category) = 'music')
      and products.is_published = true
      and products.status = 'published'
  )
);
