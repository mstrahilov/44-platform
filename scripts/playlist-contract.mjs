import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [domain, app, picker, indexRoute, detailRoute, addRoute, migration, library] = await Promise.all([
  read('src/lib/domain/playlists.ts'),
  read('src/components/PlaylistApp.tsx'),
  read('src/components/PlaylistPicker.tsx'),
  read('src/app/library/playlists/page.tsx'),
  read('src/app/library/playlists/[id]/page.tsx'),
  read('src/app/library/playlists/[id]/add/page.tsx'),
  read('supabase/migrations/20260909210000_add_playlists.sql'),
  read('src/components/LibraryApp.tsx'),
]);

for (const name of ['listPlaylists', 'createPlaylist', 'renamePlaylist', 'deletePlaylist', 'getPlaylist', 'addTrackToPlaylist', 'replacePlaylistTracks']) {
  assert.match(domain, new RegExp(`export async function ${name}`), `${name} is exposed by the playlist domain`);
}
for (const name of ['PlaylistIndexApp', 'PlaylistDetailApp', 'PlaylistAddTrackApp']) {
  assert.match(app, new RegExp(`export function ${name}`), `${name} is implemented`);
}
assert.match(picker, /Create &amp; Add/, 'overflow picker supports creating a playlist inline');
assert.match(indexRoute, /PlaylistIndexApp/);
assert.match(detailRoute, /PlaylistDetailApp/);
assert.match(addRoute, /PlaylistAddTrackApp/);
assert.match(migration, /create table public\.playlists/);
assert.match(migration, /add_track_to_playlist/);
assert.match(migration, /replace_playlist_tracks/);
assert.match(library, /listPlaylists/);
assert.match(library, /Playlists/);

console.log('Playlist contract passed.');
