-- 44 Platform library item-type foundation
-- Keeps products scalable across music, books, sample packs, interactive experiences, tools, and future item types.
-- Safe to run more than once.

alter table public.products add column if not exists runtime_type text;
alter table public.products add column if not exists launch_url text;
alter table public.products add column if not exists read_url text;
alter table public.products add column if not exists download_url text;
alter table public.resources add column if not exists download_url text;

comment on column public.products.runtime_type is
  'Runtime behavior for Library actions. Suggested values: music, book, sample_pack, interactive, product.';
comment on column public.products.launch_url is
  'Launch target for interactive products, Unity/WebGL experiences, games, or web apps.';
comment on column public.products.read_url is
  'Optional read/view target for books or readable products. Day-one Library behavior can still prefer download_url.';
comment on column public.products.download_url is
  'Download target for albums, books, sample packs, tools, and files.';
comment on column public.resources.download_url is
  'Optional download target for resource attachments such as PDFs, templates, checklists, or project files.';

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
