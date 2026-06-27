-- 44 Platform product reviews
-- Run this to support public product reviews and the SUPPORTER achievement.
-- Safe to run more than once.

begin;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.product_reviews
  add column if not exists sentiment text not null default 'recommended';

alter table public.product_reviews
  drop constraint if exists product_reviews_sentiment_check;

alter table public.product_reviews
  add constraint product_reviews_sentiment_check
  check (sentiment in ('recommended', 'not_recommended'));

alter table public.product_reviews enable row level security;

drop policy if exists "Public product reviews are readable" on public.product_reviews;
create policy "Public product reviews are readable"
on public.product_reviews
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Users can create own product reviews" on public.product_reviews;
create policy "Users can create own product reviews"
on public.product_reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own product reviews" on public.product_reviews;
create policy "Users can update own product reviews"
on public.product_reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists product_reviews_product_created_idx
  on public.product_reviews(product_id, created_at desc);

create index if not exists product_reviews_product_sentiment_idx
  on public.product_reviews(product_id, sentiment);

commit;
