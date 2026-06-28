-- 44 Platform sample library content
-- Adds one test creator plus sample book, sample pack, interactive experience, and resource.
-- Safe to run more than once. It does not delete existing data.

alter table public.products add column if not exists runtime_type text;
alter table public.products add column if not exists launch_url text;
alter table public.products add column if not exists read_url text;
alter table public.products add column if not exists download_url text;
alter table public.resources add column if not exists download_url text;

insert into public.categories (scope, slug, name, sort_order) values
  ('products', 'books', 'Books', 30),
  ('products', 'interactive', 'Interactive', 60),
  ('products', 'sample-packs', 'Sample Packs', 70),
  ('resources', 'guides', 'Guides', 10),
  ('resources', 'templates', 'Templates', 20)
on conflict (scope, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.creators (slug, name, bio, is_published) values
  ('sample-creator', 'Sample Creator', 'Sample creator used to test library content types.', true)
on conflict (slug) do update set
  name = excluded.name,
  bio = excluded.bio,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.products (
  creator_id,
  category_id,
  slug,
  title,
  creator,
  product_type,
  category,
  description,
  feature_description,
  price_cents,
  is_free,
  is_published,
  featured,
  tags,
  runtime_type,
  read_url,
  download_url,
  launch_url,
  status
)
select
  creators.id,
  categories.id,
  seed.slug,
  seed.title,
  creators.name,
  seed.product_type,
  categories.name,
  seed.description,
  seed.feature_description,
  seed.price_cents,
  seed.is_free,
  true,
  seed.featured,
  seed.tags,
  seed.runtime_type,
  seed.read_url,
  seed.download_url,
  seed.launch_url,
  'published'
from (
  values
    (
      'books',
      'sample-book-field-guide',
      'Sample Book: 44OS Field Guide',
      'Book',
      'A short sample book used to test owned book downloads and future in-app reading.',
      'A sample digital book by Sample Creator.',
      0,
      true,
      false,
      array['Book', 'Guide'],
      'book',
      'https://example.com/44os-field-guide',
      'https://example.com/44os-field-guide.pdf',
      null
    ),
    (
      'sample-packs',
      'sample-pack-starter-drums',
      'Sample Pack: Starter Drums',
      'Sample Pack',
      'A sample producer pack used to test downloadable library items.',
      'A starter sample pack by Sample Creator.',
      0,
      true,
      false,
      array['Samples', 'Drums'],
      'sample_pack',
      null,
      'https://example.com/starter-drums.zip',
      null
    ),
    (
      'interactive',
      'interactive-lab-demo',
      'Interactive Lab Demo',
      'Interactive Experience',
      'A sample launchable experience used to test Unity/WebGL style library actions.',
      'A sample interactive experience by Sample Creator.',
      0,
      true,
      false,
      array['Interactive', 'Unity'],
      'interactive',
      null,
      null,
      'https://example.com/interactive-lab'
    )
) as seed(category_slug, slug, title, product_type, description, feature_description, price_cents, is_free, featured, tags, runtime_type, read_url, download_url, launch_url)
join public.creators on creators.slug = 'sample-creator'
join public.categories on categories.scope = 'products' and categories.slug = seed.category_slug
on conflict (slug) do update set
  creator_id = excluded.creator_id,
  category_id = excluded.category_id,
  title = excluded.title,
  creator = excluded.creator,
  product_type = excluded.product_type,
  category = excluded.category,
  description = excluded.description,
  feature_description = excluded.feature_description,
  price_cents = excluded.price_cents,
  is_free = excluded.is_free,
  is_published = excluded.is_published,
  featured = excluded.featured,
  tags = excluded.tags,
  runtime_type = excluded.runtime_type,
  read_url = excluded.read_url,
  download_url = excluded.download_url,
  launch_url = excluded.launch_url,
  status = excluded.status,
  updated_at = now();

insert into public.resources (
  creator_id,
  category_id,
  slug,
  title,
  summary,
  body,
  resource_type,
  cover_url,
  download_url,
  status
)
select
  creators.id,
  categories.id,
  seed.slug,
  seed.title,
  seed.summary,
  seed.body,
  seed.resource_type,
  null,
  seed.download_url,
  'published'
from (
  values
    (
      'guides',
      'sample-article-release-checklist',
      'Sample Article: Release Checklist',
      'A sample resource article used to test saved resources in the Library.',
      'This is a sample article body. It can become a real guide, lesson, checklist, or resource page later. Save it to your Library, open the Library, then test the Download action.',
      'guide',
      'https://example.com/release-checklist.pdf'
    ),
    (
      'templates',
      'sample-template-release-plan',
      'Sample Template: Release Plan',
      'A downloadable sample template for testing resource saves and downloads.',
      'This sample template represents a downloadable planning file. Later this can point to an Ableton template, spreadsheet, PDF, or project folder.',
      'template',
      'https://example.com/release-plan-template.zip'
    )
) as seed(category_slug, slug, title, summary, body, resource_type, download_url)
join public.creators on creators.slug = 'sample-creator'
join public.categories on categories.scope = 'resources' and categories.slug = seed.category_slug
on conflict (slug) do update set
  creator_id = excluded.creator_id,
  category_id = excluded.category_id,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  resource_type = excluded.resource_type,
  cover_url = excluded.cover_url,
  download_url = excluded.download_url,
  status = excluded.status,
  updated_at = now();
