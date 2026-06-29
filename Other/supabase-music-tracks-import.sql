-- 44 Platform music track import
-- Generated from: PRODUCTS - MUSIC.csv
-- Run this in the Supabase SQL Editor after the matching music products exist.
-- It is safe to run more than once: existing track numbers update in place.
-- Track numbers are normalized by album row order so duplicate/missing CSV numbers do not break import.
--
-- Imported albums:
--   BORN IN WINTER (2013): 6 tracks
--   DELTA (2014): 6 tracks
--   MODERN RUIN (2015): 6 tracks
--   THE GREAT SHADOWSEA (2016): 20 tracks
--   mask (2017): 1 tracks
--   WAVES (2017): 20 tracks
--   GHOST (2018): 10 tracks
--   KΛREN (2020): 12 tracks
--   ELENΛ (2022): 12 tracks
--   JOZ (2023): 4 tracks
--   broken (2024): 1 tracks
--   touch (2024): 1 tracks
--   EVERYTHING AFTER (2025): 20 tracks
--   EVERYTHING BEFORE (2025): 20 tracks
--   here comes the feeling (2026): 2 tracks
--
-- Renumber notes:
--   EVERYTHING BEFORE: work was CSV track 5, imported as track 6
--   EVERYTHING BEFORE: shade was CSV track 6, imported as track 7

begin;

create temporary table temp_music_tracks_import (
  album text not null,
  year integer,
  number integer not null,
  title text not null,
  duration_seconds integer
) on commit drop;

insert into temp_music_tracks_import (album, year, number, title, duration_seconds) values
  ('BORN IN WINTER', 2013, 1, 'coma (feat. Somos)', 164),
  ('BORN IN WINTER', 2013, 2, 'strange dreams', 75),
  ('BORN IN WINTER', 2013, 3, 'the two of us', 108),
  ('BORN IN WINTER', 2013, 4, '12.18 am', 114),
  ('BORN IN WINTER', 2013, 5, 'on a train somewhere (feat. Somos)', 135),
  ('BORN IN WINTER', 2013, 6, 'awake', 93),
  ('DELTA', 2014, 1, 'swamp (feat. Somos)', 202),
  ('DELTA', 2014, 2, 'submerged (feat. Somos & c.)', 294),
  ('DELTA', 2014, 3, 'breathe', 88),
  ('DELTA', 2014, 4, 'kansas (feat. Somos)', 264),
  ('DELTA', 2014, 5, 'warm autumn days (feat. Somos & c.)', 268),
  ('DELTA', 2014, 6, 'mantra (feat. Somos & c.)', 200),
  ('MODERN RUIN', 2015, 1, 'mary jane (feat. Sola Reign)', 161),
  ('MODERN RUIN', 2015, 2, 'kings throne (feat. Halfspit & Maeve)', 274),
  ('MODERN RUIN', 2015, 3, 'little lamb (feat. c.)', 185),
  ('MODERN RUIN', 2015, 4, 'desperado (feat. Maeve)', 186),
  ('MODERN RUIN', 2015, 5, 'neptune (feat. Maeve)', 449),
  ('MODERN RUIN', 2015, 6, 'your call (feat. Maeve)', 314),
  ('THE GREAT SHADOWSEA', 2016, 1, 'bloom', 90),
  ('THE GREAT SHADOWSEA', 2016, 2, 'winter comes', 139),
  ('THE GREAT SHADOWSEA', 2016, 3, 'gemini', 122),
  ('THE GREAT SHADOWSEA', 2016, 4, 'forbidden nature', 138),
  ('THE GREAT SHADOWSEA', 2016, 5, 'on distant shores', 106),
  ('THE GREAT SHADOWSEA', 2016, 6, 'zonin', 104),
  ('THE GREAT SHADOWSEA', 2016, 7, 'in memory of', 89),
  ('THE GREAT SHADOWSEA', 2016, 8, 'lost inside the hair of him', 106),
  ('THE GREAT SHADOWSEA', 2016, 9, 'help shes dying', 112),
  ('THE GREAT SHADOWSEA', 2016, 10, 'ghost by the river', 122),
  ('THE GREAT SHADOWSEA', 2016, 11, 'mar', 282),
  ('THE GREAT SHADOWSEA', 2016, 12, 'point blank', 278),
  ('THE GREAT SHADOWSEA', 2016, 13, 'revive', 120),
  ('THE GREAT SHADOWSEA', 2016, 14, 'blackmantra', 250),
  ('THE GREAT SHADOWSEA', 2016, 15, 'polar shift', 246),
  ('THE GREAT SHADOWSEA', 2016, 16, 'blood in the streets', 153),
  ('THE GREAT SHADOWSEA', 2016, 17, 'up to 85', 186),
  ('THE GREAT SHADOWSEA', 2016, 18, 'she catches up with you', 82),
  ('THE GREAT SHADOWSEA', 2016, 19, 'sinking', 128),
  ('THE GREAT SHADOWSEA', 2016, 20, 'the great shadowsea', 210),
  ('mask', 2017, 1, 'mask (feat. Kholor & Leo W3st)', 386),
  ('WAVES', 2017, 1, 'the river flows into the sea', 319),
  ('WAVES', 2017, 2, 'when the night comes around', 79),
  ('WAVES', 2017, 3, 'three', 37),
  ('WAVES', 2017, 4, 'red letter day', 104),
  ('WAVES', 2017, 5, 'destiny', 239),
  ('WAVES', 2017, 6, 'waitin', 196),
  ('WAVES', 2017, 7, 'can''t escape your fate', 124),
  ('WAVES', 2017, 8, 'born equal', 132),
  ('WAVES', 2017, 9, 'bound', 76),
  ('WAVES', 2017, 10, 'you were saying', 157),
  ('WAVES', 2017, 11, 'just let me know', 136),
  ('WAVES', 2017, 12, 'give it to the ghost', 130),
  ('WAVES', 2017, 13, 'cut our distance in two', 84),
  ('WAVES', 2017, 14, 'blood moon', 160),
  ('WAVES', 2017, 15, 'waves', 176),
  ('WAVES', 2017, 16, 'why', 240),
  ('WAVES', 2017, 17, 'rough', 192),
  ('WAVES', 2017, 18, 'black moon', 176),
  ('WAVES', 2017, 19, 'a leaf somewhere far far away from the closest river', 138),
  ('WAVES', 2017, 20, 'dragon tail', 208),
  ('GHOST', 2018, 1, 'mask', 208),
  ('GHOST', 2018, 2, 'are you, yes you are', 112),
  ('GHOST', 2018, 3, 'oracle', 160),
  ('GHOST', 2018, 4, '44', 232),
  ('GHOST', 2018, 5, 'we live more than once', 192),
  ('GHOST', 2018, 6, 'the day she died', 232),
  ('GHOST', 2018, 7, 'soul extraction', 164),
  ('GHOST', 2018, 8, 'denied', 110),
  ('GHOST', 2018, 9, 'mouth to ear', 148),
  ('GHOST', 2018, 10, 'welcome to the end my friend', 176),
  ('KΛREN', 2020, 1, 'swallowing anger (feat. Zencali Princess)', 152),
  ('KΛREN', 2020, 2, 'suddenly', 132),
  ('KΛREN', 2020, 3, 'lambda', 142),
  ('KΛREN', 2020, 4, 'cacao (feat. Maeve)', 304),
  ('KΛREN', 2020, 5, 'daisy chain', 194),
  ('KΛREN', 2020, 6, 'illumination (feat. Maeve)', 187),
  ('KΛREN', 2020, 7, 'light in the dark (feat. Somos)', 166),
  ('KΛREN', 2020, 8, 'the sound of goodbye', 142),
  ('KΛREN', 2020, 9, 'space ocean', 160),
  ('KΛREN', 2020, 10, 'dreaming (feat. Somos)', 156),
  ('KΛREN', 2020, 11, 'miss you', 98),
  ('KΛREN', 2020, 12, 'into the mountains', 193),
  ('ELENΛ', 2022, 1, 'adrian', 105),
  ('ELENΛ', 2022, 2, 'bad blood (feat. Koukla)', 136),
  ('ELENΛ', 2022, 3, 'sun damage', 104),
  ('ELENΛ', 2022, 4, 'i am (feat. Maeve)', 139),
  ('ELENΛ', 2022, 5, 'spinning thread', 141),
  ('ELENΛ', 2022, 6, 'brand new day (feat. Rachel Fridkin, Hustie & Somos)', 215),
  ('ELENΛ', 2022, 7, 'atropos', 113),
  ('ELENΛ', 2022, 8, 'ghost (feat. Kholor)', 186),
  ('ELENΛ', 2022, 9, 'in search of release', 81),
  ('ELENΛ', 2022, 10, 'standing strong (feat. Rachel Fridkin & Somos)', 141),
  ('ELENΛ', 2022, 11, 'find our way (feat. Sarah Jouheri)', 96),
  ('ELENΛ', 2022, 12, 'going (feat. Sarah Jouheri & Le Rãnce)', 180),
  ('JOZ', 2023, 1, 'arrival', 79),
  ('JOZ', 2023, 2, 'feast of the sun (feat. Joz)', 162),
  ('JOZ', 2023, 3, 'not created nor destroyed (feat. Joz)', 131),
  ('JOZ', 2023, 4, 'you & me (feat. Joz)', 224),
  ('broken', 2024, 1, 'broken (feat. Kholor)', 192),
  ('touch', 2024, 1, 'touch (feat. Kholor)', 184),
  ('EVERYTHING AFTER', 2025, 1, 'where do you come from?', 90),
  ('EVERYTHING AFTER', 2025, 2, 'ocean', 142),
  ('EVERYTHING AFTER', 2025, 3, 'light', 90),
  ('EVERYTHING AFTER', 2025, 4, 'phases', 166),
  ('EVERYTHING AFTER', 2025, 5, 'fusion', 182),
  ('EVERYTHING AFTER', 2025, 6, 'release', 138),
  ('EVERYTHING AFTER', 2025, 7, 'acceptance', 196),
  ('EVERYTHING AFTER', 2025, 8, 'higgs', 166),
  ('EVERYTHING AFTER', 2025, 9, 'choice', 159),
  ('EVERYTHING AFTER', 2025, 10, 'remembering', 61),
  ('EVERYTHING AFTER', 2025, 11, '11', 172),
  ('EVERYTHING AFTER', 2025, 12, 'reveal', 105),
  ('EVERYTHING AFTER', 2025, 13, 'ariadne', 198),
  ('EVERYTHING AFTER', 2025, 14, 'rest', 204),
  ('EVERYTHING AFTER', 2025, 15, 'persona', 158),
  ('EVERYTHING AFTER', 2025, 16, 'carefully broken', 87),
  ('EVERYTHING AFTER', 2025, 17, 'solar bloom', 136),
  ('EVERYTHING AFTER', 2025, 18, 'rising', 204),
  ('EVERYTHING AFTER', 2025, 19, 'mend', 240),
  ('EVERYTHING AFTER', 2025, 20, 'everything before', 224),
  ('EVERYTHING BEFORE', 2025, 1, 'everything after', 98),
  ('EVERYTHING BEFORE', 2025, 2, 'tear', 186),
  ('EVERYTHING BEFORE', 2025, 3, 'falling', 124),
  ('EVERYTHING BEFORE', 2025, 4, 'feast on the sun', 164),
  ('EVERYTHING BEFORE', 2025, 5, 'handle with care', 154),
  ('EVERYTHING BEFORE', 2025, 6, 'work', 136),
  ('EVERYTHING BEFORE', 2025, 7, 'shade', 83),
  ('EVERYTHING BEFORE', 2025, 8, 'judy', 243),
  ('EVERYTHING BEFORE', 2025, 9, '隐瞒', 134),
  ('EVERYTHING BEFORE', 2025, 10, '10', 168),
  ('EVERYTHING BEFORE', 2025, 11, 'consequence', 174),
  ('EVERYTHING BEFORE', 2025, 12, 'forgetting', 197),
  ('EVERYTHING BEFORE', 2025, 13, 'mirror matter', 114),
  ('EVERYTHING BEFORE', 2025, 14, 'regrets', 81),
  ('EVERYTHING BEFORE', 2025, 15, 'tantra', 181),
  ('EVERYTHING BEFORE', 2025, 16, 'tether', 182),
  ('EVERYTHING BEFORE', 2025, 17, 'stages', 151),
  ('EVERYTHING BEFORE', 2025, 18, 'spider', 139),
  ('EVERYTHING BEFORE', 2025, 19, 'web', 121),
  ('EVERYTHING BEFORE', 2025, 20, 'where are you going?', 260),
  ('here comes the feeling', 2026, 1, 'here comes the feeling (feat. lvminvs.)', 120),
  ('here comes the feeling', 2026, 2, 'nirvana (feat. lvminvs. & Petya)', 149);

insert into public.tracks (
  product_id,
  number,
  title,
  duration_seconds,
  audio_url,
  download_url
)
select
  products.id,
  seed.number,
  seed.title,
  seed.duration_seconds,
  null,
  null
from temp_music_tracks_import seed
join public.products products
  on lower(products.title) = lower(seed.album)
 and lower(products.category) = 'music'
where products.status = 'published'
on conflict (product_id, number) do update set
  title = excluded.title,
  duration_seconds = excluded.duration_seconds;

-- This result should be empty.
-- If it returns rows, those album products do not exist yet or their titles differ in Supabase.
select
  seed.album,
  seed.year,
  count(*) as missing_track_count
from temp_music_tracks_import seed
left join public.products products
  on lower(products.title) = lower(seed.album)
 and lower(products.category) = 'music'
 and products.status = 'published'
where products.id is null
group by seed.album, seed.year
order by seed.year, seed.album;

commit;
