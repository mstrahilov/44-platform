'use client';

import { useEffect, useState } from 'react';
import { createPlaylist, listPlaylists, addReleaseToPlaylist, addTrackToPlaylist, type Playlist } from '@/lib/domain/playlists';
import { OS44Button } from '@/components/OS44Button';

export function PlaylistPicker({ userId, trackId, releaseItemId, onClose }: { userId: string; trackId?: string; releaseItemId?: string; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void listPlaylists(userId, { includeArtwork: false }).then(setPlaylists).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Could not load playlists.')).finally(() => setLoading(false));
  }, [userId]);

  async function add(playlistId?: string) {
    setSaving(true);
    setError('');
    try {
      if (releaseItemId && playlistId) await addReleaseToPlaylist(releaseItemId, playlistId);
      else if (releaseItemId) {
        const playlist = await createPlaylist(userId, title || 'New Playlist');
        await addReleaseToPlaylist(releaseItemId, playlist.id);
      } else if (trackId) await addTrackToPlaylist(trackId, playlistId, playlistId ? undefined : title);
      onClose();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : 'Could not add this track.');
    } finally {
      setSaving(false);
    }
  }

  async function createAndAdd() {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const playlist = await createPlaylist(userId, title);
      if (releaseItemId) await addReleaseToPlaylist(releaseItemId, playlist.id);
      else if (trackId) await addTrackToPlaylist(trackId, playlist.id);
      onClose();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : 'Could not create this playlist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="playlist-picker-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="playlist-picker ui44-panel ui44-panel-glass" role="dialog" aria-modal="true" aria-labelledby="playlist-picker-title">
        <div className="playlist-picker-heading">
          <h2 id="playlist-picker-title">Add {releaseItemId ? 'Release' : 'Track'} to Playlist</h2>
          <button type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {loading ? <p className="ui44-state">Loading playlists…</p> : null}
        {!loading && playlists.length ? <div className="playlist-picker-list">{playlists.map(playlist => <button key={playlist.id} type="button" disabled={saving} onClick={() => void add(playlist.id)}>{playlist.title}</button>)}</div> : null}
        {!loading && !playlists.length ? <p className="ui44-state">No playlists yet. Create one below.</p> : null}
        <div className="playlist-picker-create">
          <input value={title} onChange={event => setTitle(event.target.value)} placeholder="New playlist name" aria-label="New playlist name" />
          <OS44Button disabled={!title.trim() || saving} onClick={() => void createAndAdd()}>Create &amp; Add</OS44Button>
        </div>
        {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
