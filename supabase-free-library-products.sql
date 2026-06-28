-- 44 Platform free library claims
-- Run this after the clean schema when you want free products to be claimable,
-- while paid products stay reserved for the future cart/checkout flow.

-- Make existing music releases free for testing.
update public.products
set
  is_free = true,
  price_cents = 0,
  updated_at = now()
where lower(category) = 'music';

-- Replace the older testing policy that allowed all music items.
drop policy if exists "Users can add free or music products to library" on public.library_items;
drop policy if exists "Users can add free products to library" on public.library_items;
drop policy if exists "Users can remove free library products" on public.library_items;

create policy "Users can add free products to library" on public.library_items
for insert to authenticated
with check (
  auth.uid() = user_id
  and acquisition_type = 'free'
  and exists (
    select 1
    from public.products
    where products.id = library_items.product_id
      and products.is_free = true
      and products.is_published = true
      and products.status = 'published'
  )
);

create policy "Users can remove free library products" on public.library_items
for delete to authenticated
using (
  auth.uid() = user_id
  and acquisition_type = 'free'
);
