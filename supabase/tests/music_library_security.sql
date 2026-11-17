begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users(id, email, raw_user_meta_data) values
  ('44000000-0000-4000-8000-000000000141', 'music-owner@example.test', '{"username":"music_owner","display_name":"Music Owner"}'),
  ('44000000-0000-4000-8000-000000000142', 'music-other@example.test', '{"username":"music_other","display_name":"Music Other"}');
insert into public.catalog_items(id, slug, title, creator, item_type, status, author_id, experience_type, streaming_enabled, download_purchase_enabled)
values
  ('44000000-0000-4000-8000-000000000151', 'saved-music-release', 'Saved Music Release', 'Fixture Artist', 'album', 'published', '44000000-0000-4000-8000-000000000141', 'music', true, true),
  ('44000000-0000-4000-8000-000000000152', 'saved-music-draft', 'Draft Music Release', 'Fixture Artist', 'album', 'draft', '44000000-0000-4000-8000-000000000141', 'music', true, true);
insert into public.tracks(id, item_id, number, title, audio_url) values
  ('44000000-0000-4000-8000-000000000161', '44000000-0000-4000-8000-000000000151', 1, 'Saved Track One', 'https://example.test/one.mp3'),
  ('44000000-0000-4000-8000-000000000162', '44000000-0000-4000-8000-000000000151', 2, 'Saved Track Two', null),
  ('44000000-0000-4000-8000-000000000163', '44000000-0000-4000-8000-000000000152', 1, 'Draft Track', 'https://example.test/draft.mp3');
insert into public.playlists(id, user_id, title)
values ('44000000-0000-4000-8000-000000000171', '44000000-0000-4000-8000-000000000141', 'Music Playlist');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000141', true);

select lives_ok($$select public.set_saved_music_track('44000000-0000-4000-8000-000000000161', true)$$, 'a member can save a published playable track without Library entitlement');
select is((select count(*)::integer from public.saved_music_tracks where user_id = auth.uid()), 1, 'a single track save creates only one relationship');
select is((select count(*)::integer from public.entitlements where user_id = auth.uid() and item_id = '44000000-0000-4000-8000-000000000151' and entitlement_type = 'download' and status = 'active'), 0, 'saving a track grants no download entitlement');
select throws_ok($$select public.set_saved_music_track('44000000-0000-4000-8000-000000000162', true)$$, 'P0001', 'Published playable track not found.', 'an unplayable track cannot be individually saved');
select throws_ok($$select public.set_saved_music_track('44000000-0000-4000-8000-000000000163', true)$$, 'P0001', 'Published playable track not found.', 'a draft track cannot be saved');
select lives_ok($$select public.set_saved_music_release('44000000-0000-4000-8000-000000000151', true)$$, 'a member can save a published release');
select is((select count(*)::integer from public.saved_music_tracks where user_id = auth.uid()), 2, 'release save adds every published track, including an unplayable track');
select lives_ok($$select public.set_saved_music_track('44000000-0000-4000-8000-000000000161', false)$$, 'one saved track can be removed independently');
select is((select count(*)::integer from public.saved_music_tracks where user_id = auth.uid()), 1, 'removing one track retains the release through its remaining saved track');
select lives_ok($$select public.add_release_to_playlist('44000000-0000-4000-8000-000000000151', '44000000-0000-4000-8000-000000000171')$$, 'a playlist owner can add a published release without Library access');
select is((select array_agg(track_id order by sort_order) from public.playlist_tracks where playlist_id = '44000000-0000-4000-8000-000000000171'), array['44000000-0000-4000-8000-000000000161'::uuid, '44000000-0000-4000-8000-000000000162'::uuid], 'release playlist tracks preserve release order');
select is((select public.add_release_to_playlist('44000000-0000-4000-8000-000000000151', '44000000-0000-4000-8000-000000000171')), 0, 'adding a release again skips existing playlist tracks');
select throws_ok($$select public.add_release_to_playlist('44000000-0000-4000-8000-000000000151', '44000000-0000-4000-8000-000000000199')$$, 'P0001', 'Playlist not found.', 'members cannot add a release to another member playlist');
select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000142', true);
select is((select count(*)::integer from public.saved_music_tracks), 0, 'another member cannot read saved music relationships');
select lives_ok($$select public.set_saved_music_track('44000000-0000-4000-8000-000000000161', false)$$, 'a member cannot mutate another owner relationship by guessing its track id');
select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000141', true);
select lives_ok($$select public.set_saved_music_release('44000000-0000-4000-8000-000000000151', false)$$, 'removing a release clears all saved tracks');
select is((select count(*)::integer from public.saved_music_tracks where user_id = auth.uid()), 0, 'release removal leaves no saved tracks');

reset role;
rollback;
