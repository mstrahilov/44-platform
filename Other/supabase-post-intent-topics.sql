-- 44 Platform: post intent + general topic alignment
--
-- Safe to re-run in Supabase SQL editor.
-- This does not add a new table. The current model is:
--   posts.post_type   -> intent   ('general', 'review', 'update')
--   posts.category_id -> topic    (used only for general community posts)
--   post_subjects     -> product attachment for reviews/updates
--
-- This patch seeds the optional Collaboration topic for general posts.

begin;

insert into public.categories (scope, slug, name, sort_order)
values ('posts', 'collaboration', 'Collaboration', 65)
on conflict (scope, slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order;

notify pgrst, 'reload schema';

commit;
