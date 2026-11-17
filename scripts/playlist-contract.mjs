import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [domain, app, picker, indexRoute, detailRoute, addRoute, migration, pickerMigration, library, radioPage, topbar, shellTopbar, styles] = await Promise.all([
  read('src/lib/domain/playlists.ts'),
  read('src/components/PlaylistApp.tsx'),
  read('src/components/PlaylistPicker.tsx'),
  read('src/app/library/playlists/page.tsx'),
  read('src/app/library/playlists/[id]/page.tsx'),
  read('src/app/library/playlists/[id]/add/page.tsx'),
  read('supabase/migrations/20260909210000_add_playlists.sql'),
  read('supabase/migrations/20261116120000_playlist_published_catalog_parity.sql'),
  read('src/components/LibraryApp.tsx'),
  read('src/app/radio/page.tsx'),
  read('src/components/TopbarContext.tsx'),
  read('src/components/Topbar.tsx'),
  read('src/styles/44-ui/canonical-system.css'),
]);

for (const name of ['listPlaylists', 'createPlaylist', 'renamePlaylist', 'deletePlaylist', 'getPlaylist', 'addTrackToPlaylist', 'replacePlaylistTracks']) {
  assert.match(domain, new RegExp(`export async function ${name}`), `${name} is exposed by the playlist domain`);
}
for (const name of ['PlaylistDetailApp', 'PlaylistAddTrackApp']) {
  assert.match(app, new RegExp(`export function ${name}`), `${name} is implemented`);
}
assert.match(picker, /Create &amp; Add/, 'overflow picker supports creating a playlist inline');
assert.match(indexRoute, /LibraryApp category="playlists"/, 'the Playlists category is a first-class Library destination');
assert.match(detailRoute, /PlaylistDetailApp/);
assert.match(addRoute, /PlaylistAddTrackApp/);
assert.match(migration, /create table public\.playlists/);
assert.match(migration, /add_track_to_playlist/);
assert.match(migration, /replace_playlist_tracks/);
assert.match(domain, /export async function browseCatalogTracks/);
assert.match(domain, /browse_all_tracks_v1/);
assert.match(domain, /has_access: boolean/);
assert.doesNotMatch(domain, /export async function listCatalogTracks/);
assert.match(app, /browseCatalogTracks\(query\.trim\(\), nextCursor, 30\)/);
assert.match(app, /if \(!searchQuery\) return;/, 'catalog browse waits until a search query is entered');
assert.match(app, /Search by track or creator to find tracks to add to this playlist\./);
assert.match(app, /!needsSearch && !tracksLoading && !error/, 'catalog rows render only for a completed search');
assert.doesNotMatch(app, /playlist-add-heading/, 'Add Track has no body-level Done/header controls');
assert.match(app, /No Library access/);
assert.match(shellTopbar, /isPlaylistTrackPicker/);
assert.match(shellTopbar, /aria-label="Close Add Track"/);
assert.match(shellTopbar, /aria-label="Done adding tracks"/);
assert.match(styles, /\.playlist-track-search\s*\{\s*width:\s*100%;/, 'Add Track search spans the available content width');
assert.match(pickerMigration, /item\.status = 'published'/);
assert.match(pickerMigration, /track_status <> 'published'/);
assert.match(pickerMigration, /next_cursor/);
assert.match(radioPage, /syncedTrack\?\.trackId \? \[\{/);
assert.match(radioPage, /setPlaylistTrackId\(syncedTrack\.trackId\)/);
assert.match(radioPage, /className="os-button radio-desktop-playlist-action"/);
assert.doesNotMatch(radioPage, /setPlaylistTrackId\(currentTrack\.id\)/);
assert.match(topbar, /\[actions, setOverflowActions\]/);
assert.match(library, /listPlaylists/);
assert.match(library, /Playlists/);

console.log('Playlist contract passed.');
