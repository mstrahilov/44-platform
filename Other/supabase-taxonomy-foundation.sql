-- 44OS four-hub taxonomy foundation
-- Safe to run against an existing project. Preserves existing rows and adds missing
-- Category -> Type -> Tags support for Store, Services, Resources, and Community.

create extension if not exists pgcrypto;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'categories'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%scope%';

  if constraint_name is not null then
    execute format('alter table public.categories drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.categories
  add constraint categories_scope_check
  check (scope in ('products', 'services', 'resources', 'posts', 'creators'));

alter table public.creators
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists creator_type text;

alter table public.services
  add column if not exists service_type text;

insert into public.categories (scope, slug, name, sort_order) values
  ('products', 'music', 'Music', 10),
  ('products', 'books', 'Books', 20),
  ('products', 'sample-packs', 'Sample Packs', 30),
  ('products', 'interactive', 'Interactive', 40),
  ('products', 'tools', 'Tools', 50),
  ('products', 'apparel', 'Apparel', 60),
  ('services', 'music-production', 'Music Production', 10),
  ('services', 'session-performance', 'Session & Performance', 20),
  ('services', 'songwriting', 'Songwriting', 30),
  ('services', 'visual-design', 'Visual & Design', 40),
  ('services', 'video-motion', 'Video & Motion', 50),
  ('services', 'development', 'Development', 60),
  ('services', 'marketing', 'Marketing', 70),
  ('services', 'strategy', 'Strategy', 80),
  ('resources', 'articles', 'Articles', 5),
  ('resources', 'guides', 'Guides', 10),
  ('resources', 'templates', 'Templates', 20),
  ('resources', 'lessons', 'Lessons', 30),
  ('resources', 'downloads', 'Downloads', 40),
  ('resources', 'checklists', 'Checklists', 50),
  ('creators', 'creators', 'Creators', 10),
  ('posts', 'discussions', 'Discussions', 20),
  ('posts', 'news', 'News', 30),
  ('posts', 'streams', 'Streams', 40),
  ('posts', 'reviews', 'Reviews', 50),
  ('posts', 'showcases', 'Showcases', 60),
  ('posts', 'requests', 'Requests', 70),
  ('posts', 'updates', 'Updates', 80)
on conflict (scope, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.tags (category_id, slug, name, sort_order)
select categories.id, seed.slug, seed.name, seed.sort_order
from public.categories
join (
  values
    ('products', 'music', 'album', 'Album', 10),
    ('products', 'music', 'ep', 'EP', 20),
    ('products', 'music', 'single', 'Single', 30),
    ('products', 'music', 'compilation', 'Compilation', 40),
    ('products', 'music', 'bonus-track', 'Bonus Track', 50),
    ('products', 'books', 'art-book', 'Art Book', 10),
    ('products', 'books', 'guide-book', 'Guide Book', 20),
    ('products', 'books', 'zine', 'Zine', 30),
    ('products', 'books', 'pdf-book', 'PDF Book', 40),
    ('products', 'sample-packs', 'drum-kit', 'Drum Kit', 10),
    ('products', 'sample-packs', 'loop-pack', 'Loop Pack', 20),
    ('products', 'sample-packs', 'preset-pack', 'Preset Pack', 30),
    ('products', 'sample-packs', 'stem-pack', 'Stem Pack', 40),
    ('products', 'sample-packs', 'ableton-project', 'Ableton Project', 50),
    ('products', 'interactive', 'unity-webgl', 'Unity WebGL', 10),
    ('products', 'interactive', 'web-game', 'Web Game', 20),
    ('products', 'interactive', '3d-experience', '3D Experience', 30),
    ('products', 'interactive', 'visualizer', 'Visualizer', 40),
    ('products', 'tools', 'template', 'Template', 10),
    ('products', 'tools', 'utility', 'Utility', 20),
    ('products', 'tools', 'plugin', 'Plugin', 30),
    ('products', 'tools', 'project-file', 'Project File', 40),
    ('products', 'apparel', 'shirt', 'Shirt', 10),
    ('products', 'apparel', 'hoodie', 'Hoodie', 20),
    ('products', 'apparel', 'patch', 'Patch', 30),
    ('products', 'apparel', 'accessory', 'Accessory', 40),
    ('services', 'music-production', 'production', 'Production', 10),
    ('services', 'music-production', 'mixing', 'Mixing', 20),
    ('services', 'music-production', 'mastering', 'Mastering', 30),
    ('services', 'music-production', 'vocal-production', 'Vocal Production', 40),
    ('services', 'music-production', 'sound-design', 'Sound Design', 50),
    ('services', 'session-performance', 'guitar', 'Guitar', 10),
    ('services', 'session-performance', 'bass', 'Bass', 20),
    ('services', 'session-performance', 'drums', 'Drums', 30),
    ('services', 'session-performance', 'vocals', 'Vocals', 40),
    ('services', 'session-performance', 'keys', 'Keys', 50),
    ('services', 'songwriting', 'topline', 'Topline', 10),
    ('services', 'songwriting', 'lyrics', 'Lyrics', 20),
    ('services', 'songwriting', 'song-editing', 'Song Editing', 30),
    ('services', 'visual-design', 'cover-art', 'Cover Art', 10),
    ('services', 'visual-design', 'graphic-design', 'Graphic Design', 20),
    ('services', 'visual-design', 'branding', 'Branding', 30),
    ('services', 'visual-design', 'web-design', 'Web Design', 40),
    ('services', 'video-motion', 'editing', 'Editing', 10),
    ('services', 'video-motion', 'lyric-video', 'Lyric Video', 20),
    ('services', 'video-motion', 'music-video', 'Music Video', 30),
    ('services', 'video-motion', 'trailer', 'Trailer', 40),
    ('services', 'development', 'unity', 'Unity', 10),
    ('services', 'development', 'web-app', 'Web App', 20),
    ('services', 'development', 'website', 'Website', 30),
    ('services', 'development', 'interactive-experience', 'Interactive Experience', 40),
    ('services', 'development', 'game-prototype', 'Game Prototype', 50),
    ('services', 'marketing', 'release-campaign', 'Release Campaign', 10),
    ('services', 'marketing', 'press-pr', 'Press & PR', 20),
    ('services', 'marketing', 'social-media', 'Social Media', 30),
    ('services', 'marketing', 'playlist-pitching', 'Playlist Pitching', 40),
    ('services', 'strategy', 'creative-direction', 'Creative Direction', 10),
    ('services', 'strategy', 'project-planning', 'Project Planning', 20),
    ('services', 'strategy', 'consultation', 'Consultation', 30),
    ('resources', 'articles', 'news-article', 'News Article', 10),
    ('resources', 'articles', 'editorial', 'Editorial', 20),
    ('resources', 'articles', 'explainer', 'Explainer', 30),
    ('resources', 'articles', 'update', 'Update', 40),
    ('resources', 'guides', 'publishing-guide', 'Publishing Guide', 10),
    ('resources', 'guides', 'production-guide', 'Production Guide', 20),
    ('resources', 'guides', 'marketing-guide', 'Marketing Guide', 30),
    ('resources', 'guides', 'platform-guide', 'Platform Guide', 40),
    ('resources', 'templates', 'release-plan', 'Release Plan', 10),
    ('resources', 'templates', 'budget-sheet', 'Budget Sheet', 20),
    ('resources', 'templates', 'ableton-template', 'Ableton Template', 30),
    ('resources', 'templates', 'pitch-template', 'Pitch Template', 40),
    ('resources', 'lessons', 'music-lesson', 'Music Lesson', 10),
    ('resources', 'lessons', 'design-lesson', 'Design Lesson', 20),
    ('resources', 'lessons', 'development-lesson', 'Development Lesson', 30),
    ('resources', 'lessons', 'business-lesson', 'Business Lesson', 40),
    ('resources', 'downloads', 'pdf', 'PDF', 10),
    ('resources', 'downloads', 'project-file', 'Project File', 20),
    ('resources', 'downloads', 'preset', 'Preset', 30),
    ('resources', 'downloads', 'sample', 'Sample', 40),
    ('resources', 'downloads', 'spreadsheet', 'Spreadsheet', 50),
    ('resources', 'checklists', 'release-checklist', 'Release Checklist', 10),
    ('resources', 'checklists', 'mix-checklist', 'Mix Checklist', 20),
    ('resources', 'checklists', 'upload-checklist', 'Upload Checklist', 30),
    ('resources', 'checklists', 'launch-checklist', 'Launch Checklist', 40),
    ('creators', 'creators', 'artist', 'Artist', 10),
    ('creators', 'creators', 'producer', 'Producer', 20),
    ('creators', 'creators', 'designer', 'Designer', 30),
    ('creators', 'creators', 'developer', 'Developer', 40),
    ('creators', 'creators', 'writer', 'Writer', 50),
    ('creators', 'creators', 'filmmaker', 'Filmmaker', 60),
    ('creators', 'creators', 'label', 'Label', 70),
    ('creators', 'creators', 'studio', 'Studio', 80),
    ('creators', 'creators', 'brand', 'Brand', 90),
    ('posts', 'discussions', 'question', 'Question', 10),
    ('posts', 'discussions', 'feedback', 'Feedback', 20),
    ('posts', 'discussions', 'collaboration', 'Collaboration', 30),
    ('posts', 'discussions', 'general-discussion', 'General Discussion', 40),
    ('posts', 'discussions', 'troubleshooting', 'Troubleshooting', 50),
    ('posts', 'news', 'platform-news', 'Platform News', 10),
    ('posts', 'news', 'creator-news', 'Creator News', 20),
    ('posts', 'news', 'product-news', 'Product News', 30),
    ('posts', 'news', 'release-news', 'Release News', 40),
    ('posts', 'news', 'event-news', 'Event News', 50),
    ('posts', 'streams', 'live-show', 'Live Show', 10),
    ('posts', 'streams', 'production-stream', 'Production Stream', 20),
    ('posts', 'streams', 'listening-party', 'Listening Party', 30),
    ('posts', 'streams', 'workshop', 'Workshop', 40),
    ('posts', 'streams', 'premiere', 'Premiere', 50),
    ('posts', 'reviews', 'product-review', 'Product Review', 10),
    ('posts', 'reviews', 'service-review', 'Service Review', 20),
    ('posts', 'reviews', 'resource-review', 'Resource Review', 30),
    ('posts', 'showcases', 'music-showcase', 'Music Showcase', 10),
    ('posts', 'showcases', 'art-showcase', 'Art Showcase', 20),
    ('posts', 'showcases', 'game-showcase', 'Game Showcase', 30),
    ('posts', 'showcases', 'work-in-progress', 'Work in Progress', 40),
    ('posts', 'requests', 'help-request', 'Help Request', 10),
    ('posts', 'requests', 'collaboration-request', 'Collaboration Request', 20),
    ('posts', 'requests', 'hiring-request', 'Hiring Request', 30),
    ('posts', 'requests', 'feedback-request', 'Feedback Request', 40),
    ('posts', 'updates', 'dev-log', 'Dev Log', 10),
    ('posts', 'updates', 'release-update', 'Release Update', 20),
    ('posts', 'updates', 'project-update', 'Project Update', 30),
    ('posts', 'updates', 'creator-update', 'Creator Update', 40)
) as seed(scope, category_slug, slug, name, sort_order)
on categories.scope = seed.scope and categories.slug = seed.category_slug
on conflict (category_id, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

update public.creators
set category_id = categories.id
from public.categories
where categories.scope = 'creators'
  and categories.slug = 'creators'
  and creators.category_id is null;

update public.creators
set creator_type = case
  when lower(name) like '%44 corporation%' then 'Brand'
  when lower(coalesce(bio, '')) like '%producer%' then 'Producer'
  when lower(coalesce(bio, '')) like '%designer%' then 'Designer'
  else 'Artist'
end
where creator_type is null;

update public.services
set service_type = case
  when slug in ('beat-production', 'custom-song-production') then 'Production'
  when slug like '%mix%' then 'Mixing'
  when slug like '%master%' then 'Mastering'
  when slug like '%vocal%' then 'Vocals'
  when slug like '%guitar%' then 'Guitar'
  when slug like '%bass%' then 'Bass'
  when slug like '%drum%' or slug like '%percussion%' then 'Drums'
  when slug like '%keys%' or slug like '%piano%' then 'Keys'
  when slug like '%cover%' then 'Cover Art'
  when slug like '%brand%' then 'Branding'
  when slug like '%web%' then 'Website'
  when slug like '%game%' then 'Game Prototype'
  when slug like '%content%' then 'Social Media'
  when slug like '%release-planning%' then 'Project Planning'
  else title
end
where service_type is null or service_type = '';

update public.resources
set resource_type = case resource_type
  when 'guide' then 'Publishing Guide'
  when 'template' then 'Release Plan'
  when 'lesson' then 'Music Lesson'
  when 'download' then 'PDF'
  when 'checklist' then 'Release Checklist'
  else resource_type
end
where resource_type in ('guide', 'template', 'lesson', 'download', 'checklist');

update public.posts
set post_type = case post_type
  when 'feed' then 'General Discussion'
  when 'discussion' then 'Question'
  when 'dev_log' then 'Dev Log'
  when 'showcase' then 'Work in Progress'
  when 'update' then 'Project Update'
  else post_type
end;

update public.posts
set category_id = categories.id
from public.categories
where posts.post_type = 'Work in Progress'
  and categories.scope = 'posts'
  and categories.slug = 'showcases';

update public.posts
set category_id = categories.id
from public.categories
where posts.post_type = 'Dev Log'
  and categories.scope = 'posts'
  and categories.slug = 'updates';

create index if not exists categories_scope_slug_idx on public.categories(scope, slug);
create index if not exists tags_category_slug_idx on public.tags(category_id, slug);
create index if not exists products_category_type_idx on public.products(category_id, product_type);
create index if not exists services_category_type_idx on public.services(category_id, service_type);
create index if not exists resources_category_type_idx on public.resources(category_id, resource_type);
create index if not exists posts_category_type_idx on public.posts(category_id, post_type);
create index if not exists creators_category_type_idx on public.creators(category_id, creator_type);
