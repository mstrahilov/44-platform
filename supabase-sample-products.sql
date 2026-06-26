-- 44 Platform sample products
-- Run after supabase-products.sql. Safe to run more than once.

insert into public.products (
  title,
  creator,
  product_type,
  category,
  description,
  price_cents,
  is_free,
  is_published,
  featured,
  tags,
  cover_url
)
select *
from (
  values
    (
      'Always',
      'ØLSTEN',
      'Album',
      'Music',
      'A test album product for the first live catalog and library flow.',
      0,
      true,
      true,
      true,
      array['Music', 'Ambient', 'Electronic', 'Album'],
      null
    ),
    (
      'SOMA',
      '44 CORPORATION',
      'Game',
      'Games',
      'First-person puzzle game built around copying and pasting object states.',
      1499,
      false,
      true,
      true,
      array['Game', 'Puzzle', 'Sci-Fi', 'Interactive'],
      null
    ),
    (
      'ELSEWHERE MYTH VOL. 1',
      '44 CORPORATION',
      'Book',
      'Books',
      'The first volume of world lore, locations, factions, and mythology.',
      1299,
      false,
      true,
      true,
      array['Book', 'Lore', 'Worldbuilding'],
      null
    ),
    (
      'AMBIENT STUDIES VOL. 1',
      'ØLSTEN',
      'Sample Pack',
      'Sample Packs',
      'A compact pack of ambient textures, loops, and source recordings.',
      999,
      false,
      true,
      false,
      array['Music', 'Samples', 'Ambient', 'Production'],
      null
    ),
    (
      '44 LOGO HOODIE',
      '44 CORPORATION',
      'Apparel',
      'Apparel',
      'Heavyweight black hoodie with the 44 mark.',
      6500,
      false,
      true,
      false,
      array['Apparel', 'Hoodie', 'Merch'],
      null
    ),
    (
      'GHOST',
      'ØLSTEN',
      'Album',
      'Music',
      'A free catalog album for testing library ownership and discovery.',
      0,
      true,
      true,
      false,
      array['Music', 'Electronic', 'Experimental', 'Free'],
      null
    ),
    (
      'MYTHOLOGY VOL. I',
      '44 CORPORATION',
      'Interactive Experience',
      'Interactive',
      'A browser-native interactive lore experience for exploring a myth system.',
      0,
      true,
      true,
      true,
      array['Interactive', 'Lore', 'Experimental'],
      null
    ),
    (
      'TOUCH PATCH: PARTICLES 01',
      'lvminvs.',
      'Tool',
      'Tools',
      'A downloadable reactive particle patch for visual performance workflows.',
      1900,
      false,
      true,
      false,
      array['Tool', 'Visuals', 'TouchDesigner', 'Interactive'],
      null
    ),
    (
      'EVERYTHING BEFORE',
      'ØLSTEN',
      'Album',
      'Music',
      'An archival music product for testing older catalog entries.',
      0,
      true,
      true,
      false,
      array['Music', 'Archive', 'Album', 'Free'],
      null
    ),
    (
      'FIELD NOTES 01',
      '44 CORPORATION',
      'Book',
      'Books',
      'A compact digital field guide for early 44 worlds, symbols, and systems.',
      700,
      false,
      true,
      false,
      array['Book', 'Lore', 'Digital'],
      null
    ),
    (
      'NIGHT SHIFT',
      '44 CORPORATION',
      'Game',
      'Games',
      'A small first-person mystery prototype set inside a building that keeps changing.',
      0,
      true,
      true,
      false,
      array['Game', 'Mystery', 'Prototype', 'Free'],
      null
    ),
    (
      'ØLSTEN LIVE ROOM',
      'ØLSTEN',
      'Interactive Experience',
      'Interactive',
      'A web-based room for listening to unreleased sketches, visual loops, and album fragments.',
      0,
      true,
      true,
      true,
      array['Interactive', 'Music', 'World', 'Free'],
      null
    ),
    (
      'DRUM MACHINES 44',
      'lvminvs.',
      'Sample Pack',
      'Sample Packs',
      'Dry drum machine hits, processed loops, and performance-ready one shots.',
      1200,
      false,
      true,
      false,
      array['Samples', 'Drums', 'Production'],
      null
    ),
    (
      'SYSTEM TEE',
      '44 CORPORATION',
      'Apparel',
      'Apparel',
      'Black heavyweight tee with a small front mark and oversized back print.',
      3800,
      false,
      true,
      false,
      array['Apparel', 'T-Shirt', 'Merch'],
      null
    ),
    (
      'VISUAL PATCH: SIGNAL 02',
      'lvminvs.',
      'Tool',
      'Tools',
      'A signal-reactive visual patch for live sets and browser-based installations.',
      2400,
      false,
      true,
      false,
      array['Tool', 'Visuals', 'Live'],
      null
    )
) as seed (
  title,
  creator,
  product_type,
  category,
  description,
  price_cents,
  is_free,
  is_published,
  featured,
  tags,
  cover_url
)
where not exists (
  select 1
  from public.products
  where products.title = seed.title
    and products.creator = seed.creator
);
