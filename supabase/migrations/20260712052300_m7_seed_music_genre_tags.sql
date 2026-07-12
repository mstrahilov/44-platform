insert into public.item_tags (category_id, item_type_id, label, slug, sort_order, is_active)
select category.id, null, genre.label, genre.slug, genre.sort_order, true
from public.item_categories category
cross join (values
  ('Acoustic', 'acoustic', 10),
  ('African', 'african', 20),
  ('Afrobeats', 'afrobeats', 30),
  ('Alternative', 'alternative', 40),
  ('Amapiano', 'amapiano', 50),
  ('Americana', 'americana', 60),
  ('Anime', 'anime', 70),
  ('Arabic', 'arabic', 80),
  ('Blues', 'blues', 90),
  ('Brazilian', 'brazilian', 100),
  ('Christian & Gospel', 'christian-gospel', 110),
  ('Classical', 'classical', 120),
  ('Country', 'country', 130),
  ('Dance', 'dance', 140),
  ('Electronic', 'electronic', 150),
  ('Folk', 'folk', 160),
  ('Hip-Hop/Rap', 'hip-hop-rap', 170),
  ('Indian', 'indian', 180),
  ('Indie', 'indie', 190),
  ('Jazz', 'jazz', 200),
  ('K-Pop', 'k-pop', 210),
  ('Latin', 'latin', 220),
  ('Música Mexicana', 'musica-mexicana', 230),
  ('New Age', 'new-age', 240),
  ('Pop', 'pop', 250),
  ('R&B/Soul', 'r-b-soul', 260),
  ('Reggae', 'reggae', 270),
  ('Rock', 'rock', 280),
  ('Singer/Songwriter', 'singer-songwriter', 290),
  ('Soundtrack', 'soundtrack', 300),
  ('Spoken Word', 'spoken-word', 310),
  ('Worldwide', 'worldwide', 320)
) as genre(label, slug, sort_order)
where category.slug = 'music'
on conflict (category_id, slug) do update set
  label = excluded.label,
  item_type_id = null,
  sort_order = excluded.sort_order;
