'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import { useTopbarBack, useTopbarOverflow } from '@/components/TopbarContext';
import { addTrackToPlaylist, createPlaylist, deletePlaylist, getPlaylist, listCatalogTracks, listPlaylists, replacePlaylistTracks, renamePlaylist, type CatalogTrack, type Playlist } from '@/lib/domain/playlists';

export function PlaylistIndexApp() {
  const { user, loading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    void listPlaylists(user.id).then(setPlaylists).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Could not load playlists.'));
  }, [user]);

  async function create() {
    if (!user || !title.trim()) return;
    try {
      const playlist = await createPlaylist(user.id, title);
      setPlaylists(current => [playlist, ...current]);
      setTitle('');
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : 'Could not create playlist.');
    }
  }

  if (loading) return <PageShell><CenteredMessage status>Loading playlists…</CenteredMessage></PageShell>;
  if (!user) return <PageShell><EmptyMessage>Sign in to create playlists.</EmptyMessage></PageShell>;

  return <PageShell><main className="app-page playlist-index-page">
    <div className="playlist-index-heading"><h1>Playlists</h1><Link className="os-button os-button-secondary os-button-compact" href="/library">Library</Link></div>
    <div className="playlist-create-row"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="New playlist name" aria-label="New playlist name" /><button type="button" className="os-button os-button-primary os-button-compact" disabled={!title.trim()} onClick={() => void create()}>Create Playlist</button></div>
    {playlists.length ? <div className="playlist-grid">{playlists.map(playlist => <Link key={playlist.id} href={`/library/playlists/${playlist.id}`} className="playlist-tile ui44-panel ui44-panel-glass"><span className="playlist-tile-art" style={playlist.artwork_url ? { backgroundImage: `url(${playlist.artwork_url})` } : undefined} /><strong>{playlist.title}</strong><small>Playlist</small></Link>)}</div> : <EmptyMessage>No playlists yet.</EmptyMessage>}
    {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
  </main></PageShell>;
}

export function PlaylistCreateApp() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputId = useId();

  const save = useCallback(async () => {
    if (!user || uploading || !title.trim()) {
      if (!title.trim()) setError('Enter a playlist name first.');
      return;
    }
    try {
      const playlist = await createPlaylist(user.id, title, coverUrl || null);
      router.push(`/library/playlists/${playlist.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create playlist.');
    }
  }, [coverUrl, router, title, uploading, user]);

  useEffect(() => {
    function submit() { void save(); }
    window.addEventListener('playlist:create-submit', submit);
    return () => window.removeEventListener('playlist:create-submit', submit);
  }, [save]);

  async function handleArtwork(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadPublicFile({ file, folder: 'playlists', userId: user.id });
      setCoverUrl(uploaded.publicUrl);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <PageShell><CenteredMessage status>Loading…</CenteredMessage></PageShell>;
  if (!user) return <PageShell><EmptyMessage>Sign in to create playlists.</EmptyMessage></PageShell>;

  return <PageShell><main className="playlist-create-page">
    <label className="playlist-create-art" htmlFor={inputId} style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
      {!coverUrl ? <svg className="playlist-create-art-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3 2.5-2.5L20 17" /></svg> : null}
      <span className="sr-only">Choose playlist artwork</span>
    </label>
    <input id={inputId} className="ui44-file-input-hidden" type="file" accept="image/*" onChange={event => void handleArtwork(event.target.files?.[0])} disabled={uploading} />
    <div className="library-search-field playlist-create-title-field">
      <input id="playlist-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Playlist Name" aria-label="Playlist Name" autoFocus />
    </div>
    {uploading ? <p role="status">Uploading artwork…</p> : null}
    {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
  </main></PageShell>;
}

export function PlaylistDetailApp({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const removePlaylist = useCallback(async () => {
    if (!user) return;
    await deletePlaylist(user.id, playlistId);
    router.push('/library/playlists');
  }, [playlistId, router, user]);

  const sharePlaylist = useCallback(() => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard?.writeText(window.location.href);
  }, []);

  useTopbarBack({ href: '/library/playlists', label: 'Playlists' });
  useTopbarOverflow(useMemo(() => playlist && !editing ? [
    { id: 'share', label: 'Share', onSelect: sharePlaylist },
    { id: 'edit', label: 'Edit Playlist', onSelect: () => setEditing(true) },
    { id: 'delete', label: 'Delete Playlist', onSelect: () => { if (window.confirm('Delete this playlist?')) void removePlaylist(); } },
  ] : undefined, [playlist, editing, removePlaylist, sharePlaylist]));

  useEffect(() => {
    if (!user) return;
    void Promise.all([getPlaylist(user.id, playlistId), loadStudioProfile(user.id)])
      .then(([nextPlaylist, profileResult]) => {
        setPlaylist(nextPlaylist);
        setOwnerName(profileResult.profile?.display_name?.trim() || profileResult.profile?.username?.trim() || '');
      })
      .catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Could not load playlist.'));
  }, [playlistId, user]);

  const artwork = playlist?.cover_url || playlist?.tracks?.find(track => track.track?.item?.cover_url)?.track?.item?.cover_url || null;
  useEffect(() => {
    document.body.classList.add('playlist-detail-route');
    return () => {
      document.body.classList.remove('playlist-detail-route');
    };
  }, []);

  async function saveTracks(nextTracks: NonNullable<Playlist['tracks']>) {
    if (!playlist) return;
    try {
      await replacePlaylistTracks(playlist.id, nextTracks.map(track => track.track_id));
      setPlaylist({ ...playlist, tracks: nextTracks });
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : 'Could not update playlist.');
    }
  }

  async function saveTitle() {
    if (!user || !playlist) return;
    const title = window.prompt('Playlist name', playlist.title);
    if (!title?.trim()) return;
    const updated = await renamePlaylist(user.id, playlist.id, title);
    setPlaylist(current => current ? { ...current, ...updated } : current);
  }

  if (loading || !playlist) return <PageShell><CenteredMessage status>{error || 'Loading playlist…'}</CenteredMessage></PageShell>;
  const tracks = playlist.tracks ?? [];

  return <PageShell><main className={`playlist-detail-page${editing ? ' playlist-detail-page-editing' : ''}`}>
    <section className="playlist-detail-hero"><div className="playlist-detail-art" style={artwork ? { backgroundImage: `url(${artwork})` } : undefined} /><h1>{playlist.title}</h1><p>{ownerName || '44OS'}</p>{editing ? <p className="playlist-edit-helper">Drag to reorder, swipe to remove.</p> : null}</section>
    {editing ? <PlaylistEditList playlist={playlist} onSave={saveTracks} /> : <div className="playlist-track-list">{tracks.map((row, index) => <PlaylistTrackRow key={row.id} row={row} index={index} />)}</div>}
    {editing ? <div className="playlist-edit-actions"><button type="button" className="os-button os-button-secondary" onClick={() => setEditing(false)}>Done</button><Link className="playlist-add-track-link" href={`/library/playlists/${playlist.id}/add`}>Add Track</Link><button type="button" className="os-button os-button-ghost" onClick={saveTitle}>Rename Playlist</button></div> : null}
    {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
  </main></PageShell>;
}

function PlaylistTrackRow({ row, index }: { row: NonNullable<Playlist['tracks']>[number]; index: number }) {
  return <div className="playlist-track-row view-track-row ui44-track-row"><span className="view-track-number ui44-track-index">{index + 1}</span><span className="playlist-track-copy ui44-overflow-track-title"><strong>{row.track?.title ?? 'Track unavailable'}</strong></span><span className="playlist-track-more view-track-more">•••</span></div>;
}

function PlaylistEditList({ playlist, onSave }: { playlist: Playlist; onSave: (tracks: NonNullable<Playlist['tracks']>) => Promise<void> }) {
  const [tracks, setTracks] = useState(playlist.tracks ?? []);
  async function remove(index: number) { const next = tracks.filter((_, trackIndex) => trackIndex !== index); setTracks(next); await onSave(next); }
  async function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= tracks.length) return; const next = [...tracks]; [next[index], next[target]] = [next[target], next[index]]; setTracks(next); await onSave(next); }
  return <div className="playlist-edit-list">{tracks.map((row, index) => <div className="playlist-edit-row" key={row.id}><button type="button" className="playlist-remove-button" aria-label={`Remove ${row.track?.title ?? 'track'}`} onClick={() => void remove(index)}>−</button><span className="playlist-track-copy"><strong>{row.track?.title ?? 'Track unavailable'}</strong><small>{row.track?.item?.title ?? '44OS'}</small></span><button type="button" className="playlist-reorder-button" aria-label="Move up" onClick={() => void move(index, -1)}>☰</button><button type="button" className="playlist-reorder-button" aria-label="Move down" onClick={() => void move(index, 1)}>⌄</button></div>)}</div>;
}

export function PlaylistAddTrackApp({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useTopbarBack({ href: `/library/playlists/${playlistId}`, label: 'Playlist' });
  useEffect(() => {
    if (!user) return;
    void Promise.all([getPlaylist(user.id, playlistId), listCatalogTracks()]).then(([nextPlaylist, nextTracks]) => { setPlaylist(nextPlaylist); setTracks(nextTracks); }).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Could not load tracks.'));
  }, [playlistId, user]);
  const existing = new Set((playlist?.tracks ?? []).map(row => row.track_id));
  const visible = tracks.filter(track => `${track.title} ${track.item?.title ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 200);
  async function add(track: CatalogTrack) {
    if (!playlist || existing.has(track.id)) return;
    setBusy(track.id); setError('');
    try { await addTrackToPlaylist(track.id, playlist.id); setPlaylist(await getPlaylist(user!.id, playlistId)); }
    catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : 'This track could not be added.'); }
    finally { setBusy(null); }
  }
  if (loading || !playlist) return <PageShell><CenteredMessage status>{error || 'Loading tracks…'}</CenteredMessage></PageShell>;
  return <PageShell><main className="playlist-add-page"><div className="playlist-add-heading"><button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => router.push(`/library/playlists/${playlistId}`)}>Done</button><h1>Add Track</h1></div><input className="playlist-track-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tracks or creators" aria-label="Search tracks or creators" /><div className="playlist-catalog-track-list">{visible.map(track => <div className="playlist-catalog-track" key={track.id}><span className="playlist-catalog-art" style={track.item?.cover_url ? { backgroundImage: `url(${track.item.cover_url})` } : undefined} /><span className="playlist-track-copy"><strong>{track.title}</strong><small>{track.item?.title ?? '44OS'}</small></span><button type="button" disabled={busy === track.id || existing.has(track.id)} onClick={() => void add(track)}>{existing.has(track.id) ? '✓' : '+'}</button></div>)}</div>{error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}</main></PageShell>;
}
