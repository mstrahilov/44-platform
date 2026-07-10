-- Final 44OS Steam-style foundation.
-- Store/Library are canonical. Music streams publicly; music purchase unlocks downloads.

alter table public.products
  add column if not exists streaming_enabled boolean not null default true,
  add column if not exists download_purchase_enabled boolean not null default true;

alter table public.tracks
  add column if not exists download_url text;

update public.products
set fulfillment_type = case
  when lower(coalesce(fulfillment_type, '')) in ('physical', 'digital', 'hybrid') then lower(fulfillment_type)
  when lower(coalesce(experience_type, '')) in ('merch', 'physical') then 'physical'
  when lower(coalesce(category, '')) in ('merch', 'apparel', 'shop') then 'physical'
  when lower(coalesce(product_type, '')) like any (array['%shirt%', '%hoodie%', '%poster%', '%merch%']) then 'physical'
  else 'digital'
end
where fulfillment_type is null
  or lower(coalesce(fulfillment_type, '')) not in ('physical', 'digital', 'hybrid');

update public.products
set experience_type = case
  when lower(coalesce(experience_type, '')) in ('music', 'book', 'asset', 'radio', 'video', 'game', 'merch', 'other') then lower(experience_type)
  when lower(coalesce(experience_type, '')) = 'physical' then 'merch'
  when fulfillment_type = 'physical' then 'merch'
  when lower(coalesce(runtime_type, '')) in ('book', 'artbook') then 'book'
  when lower(coalesce(category, '')) in ('books', 'book') then 'book'
  when lower(coalesce(product_type, '')) like any (array['%book%', '%artbook%', '%novel%']) then 'book'
  when lower(coalesce(runtime_type, '')) in ('asset', 'sample pack') then 'asset'
  when lower(coalesce(category, '')) in ('assets', 'sample packs') then 'asset'
  when lower(coalesce(product_type, '')) like any (array['%asset%', '%sample%', '%stem%', '%preset%', '%template%']) then 'asset'
  when lower(coalesce(runtime_type, '')) in ('radio') then 'radio'
  when lower(coalesce(runtime_type, '')) in ('game', 'interactive') then 'game'
  when lower(coalesce(category, '')) in ('music') then 'music'
  when lower(coalesce(product_type, '')) like any (array['%album%', '%ep%', '%single%', '%track%']) then 'music'
  else 'other'
end
where experience_type is null
  or lower(coalesce(experience_type, '')) not in ('music', 'book', 'asset', 'radio', 'video', 'game', 'merch', 'other');

update public.products
set streaming_enabled = true
where experience_type = 'music' and streaming_enabled is distinct from true;

update public.products
set download_purchase_enabled = true
where experience_type = 'music' and download_purchase_enabled is distinct from true;

alter table public.products
  alter column experience_type set not null,
  alter column fulfillment_type set not null;

alter table public.products
  drop constraint if exists products_experience_type_check,
  add constraint products_experience_type_check
    check (experience_type in ('music', 'book', 'asset', 'radio', 'video', 'game', 'merch', 'other'));

alter table public.products
  drop constraint if exists products_fulfillment_type_check,
  add constraint products_fulfillment_type_check
    check (fulfillment_type in ('digital', 'physical', 'hybrid'));

insert into public.profile_follows (follower_id, following_id)
select requester_id, addressee_id
from public.friend_requests
where status in ('pending', 'accepted')
on conflict (follower_id, following_id) do nothing;

insert into public.profile_follows (follower_id, following_id)
select addressee_id, requester_id
from public.friend_requests
where status = 'accepted'
on conflict (follower_id, following_id) do nothing;

delete from public.posts
where lower(coalesce(post_type, 'general')) not in ('general');

update public.posts
set post_type = 'general'
where post_type is null or post_type <> 'general';

alter table public.posts
  drop constraint if exists posts_post_type_check,
  add constraint posts_post_type_check check (post_type = 'general');

drop table if exists public.post_subjects cascade;

alter table public.product_reviews
  drop column if exists legacy_post_id;

alter table public.product_updates
  drop column if exists legacy_post_id;

drop table if exists public.friend_requests cascade;
-- Applied historical migration. Retained for clean database replay.
-- Do not run this file manually against an existing database; use the ordered
-- Supabase migration workflow with a current backup.
