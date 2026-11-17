begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users(id, email, raw_user_meta_data) values
  ('44000000-0000-4000-8000-000000000041', 'playlist-owner@example.test', '{"username":"playlist_owner","display_name":"Playlist Owner"}'),
  ('44000000-0000-4000-8000-000000000042', 'playlist-other@example.test', '{"username":"playlist_other","display_name":"Playlist Other"}');

insert into public.catalog_items(id, slug, title, creator, item_type, status, author_id, experience_type)
values
  ('44000000-0000-4000-8000-000000000051', 'playlist-parity-published-a', 'Playlist Parity Fixture Album', 'Fixture Creator', 'album', 'published', '44000000-0000-4000-8000-000000000041', 'music'),
  ('44000000-0000-4000-8000-000000000052', 'playlist-parity-published-b', 'Playlist Parity Fixture Album', 'Fixture Creator', 'album', 'published', '44000000-0000-4000-8000-000000000041', 'music'),
  ('44000000-0000-4000-8000-000000000053', 'playlist-parity-draft', 'Playlist Parity Draft Album', 'Fixture Creator', 'album', 'draft', '44000000-0000-4000-8000-000000000041', 'music'),
  ('44000000-0000-4000-8000-000000000054', 'playlist-parity-archived', 'Playlist Parity Archived Album', 'Fixture Creator', 'album', 'archived', '44000000-0000-4000-8000-000000000041', 'music');

insert into public.tracks(id, item_id, number, title, audio_url) values
  ('44000000-0000-4000-8000-000000000061', '44000000-0000-4000-8000-000000000051', 1, 'Parity Track A', 'https://example.test/parity-a.mp3'),
  ('44000000-0000-4000-8000-000000000062', '44000000-0000-4000-8000-000000000052', 1, 'Parity Track B', 'https://example.test/parity-b.mp3'),
  ('44000000-0000-4000-8000-000000000063', '44000000-0000-4000-8000-000000000053', 1, 'Parity Draft Track', 'https://example.test/parity-draft.mp3'),
  ('44000000-0000-4000-8000-000000000064', '44000000-0000-4000-8000-000000000054', 1, 'Parity Archived Track', 'https://example.test/parity-archived.mp3');

insert into public.playlists(id, user_id, title) values
  ('44000000-0000-4000-8000-000000000071', '44000000-0000-4000-8000-000000000041', 'Owner Playlist'),
  ('44000000-0000-4000-8000-000000000072', '44000000-0000-4000-8000-000000000042', 'Other Playlist');
insert into public.playlist_tracks(playlist_id, track_id, sort_order)
values ('44000000-0000-4000-8000-000000000071', '44000000-0000-4000-8000-000000000064', 0);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000041', true);

select lives_ok(
  $$select public.add_track_to_playlist('44000000-0000-4000-8000-000000000061', '44000000-0000-4000-8000-000000000071', null)$$,
  'owner can add a published track without Library access'
);
select is(
  (select count(*)::integer from public.playlist_tracks where playlist_id = '44000000-0000-4000-8000-000000000071' and track_id = '44000000-0000-4000-8000-000000000061'),
  1,
  'the published track is added once'
);
select lives_ok(
  $$select public.add_track_to_playlist('44000000-0000-4000-8000-000000000061', '44000000-0000-4000-8000-000000000071', null)$$,
  'repeated add is idempotent'
);
select throws_ok(
  $$select public.add_track_to_playlist('44000000-0000-4000-8000-000000000063', '44000000-0000-4000-8000-000000000071', null)$$,
  'P0001', 'Only published tracks can be added to a playlist.',
  'draft tracks cannot be added'
);
select throws_ok(
  $$select public.add_track_to_playlist('44000000-0000-4000-8000-000000000061', '44000000-0000-4000-8000-000000000072', null)$$,
  'P0001', 'Playlist not found.',
  'members cannot add tracks to another owner playlist'
);

select lives_ok(
  $$select public.replace_playlist_tracks('44000000-0000-4000-8000-000000000071', array['44000000-0000-4000-8000-000000000061'::uuid, '44000000-0000-4000-8000-000000000064'::uuid])$$,
  'reorder save retains an archived track already in the playlist and the unowned published track'
);
select is(
  (select array_agg(track_id order by sort_order) from public.playlist_tracks where playlist_id = '44000000-0000-4000-8000-000000000071'),
  array['44000000-0000-4000-8000-000000000061'::uuid, '44000000-0000-4000-8000-000000000064'::uuid],
  'replacement persists the requested track order'
);
select throws_ok(
  $$select public.replace_playlist_tracks('44000000-0000-4000-8000-000000000071', array['44000000-0000-4000-8000-000000000061'::uuid, '44000000-0000-4000-8000-000000000063'::uuid])$$,
  'P0001', 'Only published tracks or tracks already in this playlist can be saved.',
  'a new draft track cannot be introduced by a reorder save'
);
select throws_ok(
  $$select public.replace_playlist_tracks('44000000-0000-4000-8000-000000000071', array['44000000-0000-4000-8000-000000000061'::uuid, '44000000-0000-4000-8000-000000000061'::uuid])$$,
  'P0001', 'A playlist cannot contain the same track more than once.',
  'replacement rejects duplicate track ids'
);
select lives_ok(
  $$select public.replace_playlist_tracks('44000000-0000-4000-8000-000000000071', array['44000000-0000-4000-8000-000000000061'::uuid])$$,
  'owner can remove a track while saving the ordered list'
);
select is(
  (select count(*)::integer from public.playlist_tracks where playlist_id = '44000000-0000-4000-8000-000000000071'),
  1,
  'removal leaves exactly the requested track'
);

select is(
  jsonb_array_length(public.browse_all_tracks_v1('Playlist Parity Fixture', null, 1)->'items'),
  1,
  'browse honors its page limit'
);
select is(
  jsonb_typeof(public.browse_all_tracks_v1('Playlist Parity Fixture', null, 1)->'next_cursor'),
  'object',
  'browse returns a next cursor when more results exist'
);
select is(
  (public.browse_all_tracks_v1('Playlist Parity Fixture', null, 1)->'items'->0->>'has_access'),
  'false',
  'browse reports missing Library access without hiding published tracks'
);
select is(
  jsonb_array_length(public.browse_all_tracks_v1('Playlist Parity Fixture', public.browse_all_tracks_v1('Playlist Parity Fixture', null, 1)->'next_cursor', 1)->'items'),
  1,
  'browse cursor returns the next page'
);
select is(
  (select count(*)::integer from public.entitlements where user_id = '44000000-0000-4000-8000-000000000041' and item_id in ('44000000-0000-4000-8000-000000000051', '44000000-0000-4000-8000-000000000052')),
  0,
  'playlist additions do not grant Library entitlements'
);

select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000042', true);
select throws_ok(
  $$select public.replace_playlist_tracks('44000000-0000-4000-8000-000000000071', array[]::uuid[])$$,
  'P0001', 'Playlist not found.',
  'members cannot replace tracks in another owner playlist'
);

select * from finish();
rollback;
