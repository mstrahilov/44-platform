import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, library, libraryApp, albumDetail, storeDetail, player, topbar, search, storeApp, plan] = await Promise.all([
  read('supabase/migrations/20261116130000_saved_music_library.sql'),
  read('src/lib/domain/library.ts'),
  read('src/components/LibraryApp.tsx'),
  read('src/components/LibraryMusicRelease.tsx'),
  read('src/app/store/item/[identifier]/page.tsx'),
  read('src/components/MusicPlayer.tsx'),
  read('src/components/Topbar.tsx'),
  read('src/app/library/search/page.tsx'),
  read('src/components/StoreApp.tsx'),
  read('Other/44OS_PLAN.md'),
]);

for (const name of ['set_saved_music_track', 'set_saved_music_release', 'add_release_to_playlist']) {
  assert.match(migration, new RegExp(`function public\\.${name}`), `${name} exists in the additive M0 migration`);
}
assert.match(migration, /create table public\.saved_music_tracks[\s\S]*primary key \(user_id, track_id\)/);
assert.match(migration, /where item\.experience_type = 'music'[\s\S]*entry\.status = 'visible'/, 'visible saved music releases are backfilled');
assert.doesNotMatch(migration, /insert into public\.entitlements/i, 'saved music does not grant an entitlement');
assert.match(migration, /track\.audio_url is not null/, 'single-track saves require playable audio');
assert.match(migration, /order by track\.number, track\.id/, 'release playlist inserts preserve release order');
assert.match(library, /setSavedMusicTrack/);
assert.match(library, /setSavedMusicRelease/);
assert.match(library, /releaseTrackIds = \(tracks\.data \?\? \[\]\)\.map\(track => track\.id\)/, 'release membership lookup gathers that release’s track IDs first');
assert.match(library, /query\.in\('track_id', releaseTrackIds\)/, 'release membership lookup filters saved rows by track ID without embedded-relation filtering');
assert.doesNotMatch(library, /query\.eq\('track\.item_id'/, 'release membership lookup avoids the failing embedded relation filter');
assert.match(libraryApp, /Music/);
assert.match(libraryApp, /Playlists/);
assert.match(libraryApp, /\['recently-added', 'Recently Added'\][\s\S]*\['creator', 'Creator \(A–Z\)'\]/, 'Library sort offers recently added and alphabetical creator sorting');
assert.match(libraryApp, /\['release-date', 'Release Date'\]/, 'Library offers one newest-first release-date sort when dates are available');
assert.doesNotMatch(libraryApp, /Oldest Added|Newest Release|Oldest Release/, 'Library sort omits superseded choices');
assert.match(libraryApp, /\/library\/music\/\$\{product\.id\}/, 'album card opens its saved-track detail');
assert.match(albumDetail, /listSavedMusicTracks\(user\.id, itemId\)/, 'Library release detail is scoped to saved tracks');
assert.match(storeDetail, /saveItemToLibrary\(user\.id, product\.id\)/, 'hosted release saving uses the existing whole-item contract');
assert.doesNotMatch(storeDetail, /setSavedMusicTrack|setSavedMusicRelease|listSavedMusicTrackIds/, 'hosted release detail does not require the deferred saved-track contract');
assert.match(storeDetail, /label: 'Add to Library'[\s\S]*label: 'Add to Playlist'[\s\S]*label: 'Add to Queue'[\s\S]*label: 'Share'/, 'release menu keeps the hosted-compatible action order');
assert.match(storeDetail, /queueReleaseNext\(playableTracks\)/);
assert.match(player, /function queueReleaseNext/);
assert.match(player, /nextQueue\.splice\(insertAt, 0/);
assert.match(topbar, /libraryScope=\{pathname\.startsWith\('\/library'\)\}/);
assert.match(topbar, /Cancel new playlist[\s\S]*router\.push\('\/library\/playlists'\)/, 'canceling playlist creation returns to the Playlists category');
assert.match(await read('src/components/PlaylistApp.tsx'), /router\.push\(`\/library\/playlists\/\$\{playlist\.id\}`\)/, 'successful playlist creation opens the new playlist');
assert.match(search, /listSavedMusicTracks\(user\.id\)/, 'Library search reads the member saved relationship');
assert.match(search, /isSavedMusicContractMissing\(musicError\)/, 'Library search falls back when the deferred table is absent');
assert.match(search, /productLibraryHref\(product, item\.id\)/, 'legacy Library search results open existing whole-item detail');
assert.match(storeApp, /const mobileDiscoverRail = !loading && !authLoading && !error \?/,
  'Discover tabs stay hidden until the requested content finishes loading');
assert.match(plan, /Deferred iOS parity/);

console.log('Music Library contract passed.');
