-- 44 Platform neutral sample data
-- Use after supabase-clean-reset.sql when you want generic UI test content.
-- This clears public catalog/community test content, but does not delete Supabase Auth users or profiles.

begin;

delete from public.service_requests;
delete from public.saved_resources;
delete from public.library_items;
delete from public.post_tags;
delete from public.resource_tags;
delete from public.service_tags;
delete from public.product_tags;
delete from public.posts;
delete from public.resources;
delete from public.services;
delete from public.products;
delete from public.creators;

insert into public.creators (slug, name, bio, is_published) values
  ('creator-a', 'Creator A', 'Placeholder creator profile for testing products, services, posts, and resources.', true),
  ('creator-b', 'Creator B', 'Placeholder creator profile for testing a second public catalog.', true),
  ('creator-c', 'Creator C', 'Placeholder creator profile for testing community and service surfaces.', true);

insert into public.products (creator_id, category_id, slug, title, creator, product_type, category, description, price_cents, is_free, featured, tags)
select creators.id, categories.id, seed.slug, seed.title, creators.name, seed.product_type, categories.name, seed.description, seed.price_cents, seed.is_free, seed.featured, seed.tags
from (
  values
    ('creator-a', 'music', 'product-a', 'Product A', 'Album', 'Description text for a music product used to test product cards and detail pages.', 0, true, true, array['Album', 'Ambient']),
    ('creator-b', 'games', 'product-b', 'Product B', 'Game', 'Description text for a game product used to test grid wrapping and product pages.', 1499, false, true, array['Puzzle', 'Web Game']),
    ('creator-c', 'interactive', 'product-c', 'Product C', 'Interactive Experience', 'Description text for an interactive product used to test hero and browse surfaces.', 0, true, true, array['Interactive', 'Unity']),
    ('creator-a', 'sample-packs', 'product-d', 'Product D', 'Sample Pack', 'Description text for a sample pack product.', 999, false, false, array['Samples', 'Ambient']),
    ('creator-b', 'books', 'product-e', 'Product E', 'Book', 'Description text for a book product.', 1299, false, false, array['Lore']),
    ('creator-c', 'tools', 'product-f', 'Product F', 'Tool', 'Description text for a creator tool product.', 0, true, false, array['Tool']),
    ('creator-a', 'apparel', 'product-g', 'Product G', 'Apparel', 'Description text for an apparel product.', 2499, false, false, array['Apparel']),
    ('creator-b', 'music', 'product-h', 'Product H', 'EP', 'Description text for a second music product.', 799, false, false, array['Electronic']),
    ('creator-c', 'games', 'product-i', 'Product I', 'Game', 'Description text for a second game product.', 0, true, false, array['Puzzle']),
    ('creator-a', 'interactive', 'product-j', 'Product J', 'Interactive Experience', 'Description text for a second interactive product.', 1999, false, false, array['Unity'])
) as seed(creator_slug, category_slug, slug, title, product_type, description, price_cents, is_free, featured, tags)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'products' and categories.slug = seed.category_slug;

insert into public.services (creator_id, category_id, slug, title, description, starting_price_cents, delivery_estimate, featured)
select creators.id, categories.id, seed.slug, seed.title, seed.description, seed.starting_price_cents, seed.delivery_estimate, seed.featured
from (
  values
    ('creator-a', 'music', 'music-production', 'Music Production', 'Full track production from concept to master-ready file.', 14900, '5-7 day delivery', true),
    ('creator-b', 'design', 'web-design', 'Web Design', 'Website and landing page design for creators, products, and releases.', 29900, '7-10 day delivery', true),
    ('creator-c', 'design', 'graphic-design', 'Graphic Design', 'Visual identity, cover design, and campaign assets.', 9900, '3-5 day delivery', true),
    ('creator-a', 'video', 'video-editing', 'Video Editing', 'Editing for music videos, social clips, trailers, and recap content.', 19900, '5-7 day delivery', false),
    ('creator-b', 'development', 'game-development', 'Game Development', 'Prototype and web game development for interactive creator experiences.', 49900, 'Project-based', false),
    ('creator-c', 'consulting', 'creative-consulting', 'Creative Consulting', 'Strategy session for releases, services, community, and catalog planning.', 7900, '2-3 day delivery', false)
) as seed(creator_slug, category_slug, slug, title, description, starting_price_cents, delivery_estimate, featured)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'services' and categories.slug = seed.category_slug;

insert into public.resources (creator_id, category_id, slug, title, summary, body, resource_type)
select creators.id, categories.id, seed.slug, seed.title, seed.summary, seed.body, seed.resource_type
from (
  values
    ('creator-a', 'guides', 'guide-a', 'Guide A', 'Generic guide summary for testing resource cards.', 'Description text for Guide A.', 'guide'),
    ('creator-b', 'templates', 'template-a', 'Template A', 'Generic template summary for testing saved resources.', 'Description text for Template A.', 'template'),
    ('creator-c', 'lessons', 'lesson-a', 'Lesson A', 'Generic lesson summary for testing community learning content.', 'Description text for Lesson A.', 'lesson'),
    ('creator-a', 'downloads', 'download-a', 'Download A', 'Generic download summary for testing resource categories.', 'Description text for Download A.', 'download'),
    ('creator-b', 'checklists', 'checklist-a', 'Checklist A', 'Generic checklist summary for launch and workflow testing.', 'Description text for Checklist A.', 'checklist')
) as seed(creator_slug, category_slug, slug, title, summary, body, resource_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'resources' and categories.slug = seed.category_slug;

insert into public.posts (creator_id, category_id, title, body, post_type)
select creators.id, categories.id, seed.title, seed.body, seed.post_type
from (
  values
    ('creator-a', 'feed', 'Post A', 'Generic community feed post for testing.', 'feed'),
    ('creator-b', 'dev-logs', 'Post B', 'Generic development log post for testing.', 'dev_log'),
    ('creator-c', 'showcase', 'Post C', 'Generic showcase post for testing.', 'showcase'),
    ('creator-a', 'discussions', 'Post D', 'Generic discussion post for testing.', 'discussion'),
    ('creator-b', 'updates', 'Post E', 'Generic update post for testing.', 'update')
) as seed(creator_slug, category_slug, title, body, post_type)
join public.creators on creators.slug = seed.creator_slug
join public.categories on categories.scope = 'posts' and categories.slug = seed.category_slug;

commit;
