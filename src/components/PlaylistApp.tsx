'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { OS44Button } from '@/components/OS44Button';
import { useAuth } from '@/lib/useAuth';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import { useTopbarBack, useTopbarOverflow, useTopbarTitle } from '@/components/TopbarContext';
import { addTrackToPlaylist, browseCatalogTracks, createPlaylist, deletePlaylist, getPlaylist, replacePlaylistTracks, renamePlaylist, type CatalogTrack, type CatalogTrackCursor, type Playlist } from '@/lib/domain/playlists';
import { DetailPageHeader } from '@/components/LibraryDetailPrimitives';
import { ReleaseArtworkAtmosphere } from '@/components/ReleaseArtworkAtmosphere';
import { PlaylistTrackList } from '@/components/PlaylistTrackList';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { productBrowseHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { PlaylistPicker } from '@/components/PlaylistPicker';

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
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const { currentTrack, isPlaying, queueNext, toggleTrack } = useMusicPlayer();

  const removePlaylist = useCallback(async () => {
    if (!user) return;
    await deletePlaylist(user.id, playlistId);
    router.push('/library');
  }, [playlistId, router, user]);

  const sharePlaylist = useCallback(() => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard?.writeText(window.location.href);
  }, []);

  useTopbarBack({ href: '/library', label: 'Library' });
  useTopbarTitle('');
  useTopbarOverflow(useMemo(() => playlist && !editing ? [
    { id: 'share', label: 'Share', onSelect: sharePlaylist },
    { id: 'edit', label: 'Edit Playlist', onSelect: () => setEditing(true) },
    { id: 'delete', label: 'Delete Playlist', onSelect: () => { if (window.confirm('Delete this playlist?')) void removePlaylist(); } },
  ] : undefined, [playlist, editing, removePlaylist, sharePlaylist]));

  useEffect(() => {
    if (!user) return;
    void getPlaylist(user.id, playlistId)
      .then(setPlaylist)
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

  function shareTrack(trackId: string, itemId: string | undefined) {
    if (!itemId || typeof window === 'undefined') return;
    const url = new URL(productBrowseHref({ id: itemId }), window.location.origin);
    url.searchParams.set('track', trackId);
    if (user?.id) url.searchParams.set('ref', user.id);
    void navigator.clipboard?.writeText(url.toString());
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Track link copied to clipboard' } }));
  }

  if (loading) return <PageShell><CenteredMessage status>Loading playlist…</CenteredMessage></PageShell>;
  if (!user) return <PageShell><CenteredMessage status>Sign in to view this playlist.</CenteredMessage></PageShell>;
  if (!playlist) return <PageShell><CenteredMessage status>{error || 'Loading playlist…'}</CenteredMessage></PageShell>;
  const tracks = playlist.tracks ?? [];
  const queue: MusicQueueTrack[] = tracks.filter(row => row.track?.audio_url).map(row => {
    const track = row.track!;
    return {
      id: track.id,
      title: track.title,
      artist: track.item?.creators?.display_name || track.item?.creator || '44OS',
      releaseTitle: track.item?.title || '',
      artworkUrl: track.item?.cover_url || null,
      audioUrl: track.audio_url!,
      durationSeconds: track.duration_seconds,
      productId: track.item_id,
      releaseHref: `/library/music/${track.item_id}`,
    };
  });

  return <PageShell><main className={`view-detail-single library-detail-page playlist-detail-page${editing ? ' playlist-detail-page-editing' : ''}`}>
    {playlistTrackId ? <PlaylistPicker userId={user.id} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
    <ReleaseArtworkAtmosphere artworkUrl={artwork} />
    <DetailPageHeader
      artworkUrl={artwork}
      artworkTitle={playlist.title}
      title={playlist.title}
      creatorName="44OS"
      creatorTone="secondary"
      meta={['Playlist']}
      showCreatorIdentity={false}
      artworkFallback={<span className="playlist-detail-art-fallback" aria-hidden="true">♫</span>}
    >
      {editing ? <p className="playlist-edit-helper">Drag to reorder, swipe to remove.</p> : null}
    </DetailPageHeader>
    {editing ? <PlaylistEditList playlist={playlist} onSave={saveTracks} /> : <PlaylistTrackList label={`${playlist.title} tracks`} rows={tracks.map((row, index) => {
      const queueIndex = queue.findIndex(track => track.id === row.track_id);
      return {
        id: row.id,
        number: index + 1,
        title: row.track?.title ?? 'Track unavailable',
        artist: row.track?.item?.creators?.display_name || row.track?.item?.creator || '44OS',
        artistHref: creatorHref(row.track?.item?.creators ?? row.track?.item?.creator),
        actions: [
          { id: 'playlist', label: 'Add to Playlist', onSelect: () => setPlaylistTrackId(row.track_id) },
          { id: 'queue', label: 'Add to Queue', onSelect: () => { if (queueIndex >= 0) queueNext(queue[queueIndex]); }, disabled: queueIndex < 0 },
          { id: 'share', label: 'Share', onSelect: () => shareTrack(row.track_id, row.track?.item?.id), disabled: !row.track?.item?.id },
        ],
        active: currentTrack?.id === row.track_id,
        playing: currentTrack?.id === row.track_id && isPlaying,
        onPlay: queueIndex >= 0 ? () => toggleTrack(queue, queueIndex) : undefined,
      };
    })} />}
    {editing ? <div className="playlist-edit-actions"><OS44Button onClick={() => setEditing(false)}>Done</OS44Button><OS44Button href={`/library/playlists/${playlist.id}/add`}>Add Track</OS44Button><OS44Button onClick={saveTitle}>Rename Playlist</OS44Button></div> : null}
    {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
  </main></PageShell>;
}

function PlaylistEditList({ playlist, onSave }: { playlist: Playlist; onSave: (tracks: NonNullable<Playlist['tracks']>) => Promise<void> }) {
  const [tracks, setTracks] = useState(playlist.tracks ?? []);
  async function remove(index: number) { const next = tracks.filter((_, trackIndex) => trackIndex !== index); setTracks(next); await onSave(next); }
  async function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= tracks.length) return; const next = [...tracks]; [next[index], next[target]] = [next[target], next[index]]; setTracks(next); await onSave(next); }
  return <div className="playlist-edit-list">{tracks.map((row, index) => <div className="playlist-edit-row" key={row.id}><button type="button" className="playlist-remove-button" aria-label={`Remove ${row.track?.title ?? 'track'}`} onClick={() => void remove(index)}>−</button><span className="playlist-track-copy"><strong>{row.track?.title ?? 'Track unavailable'}</strong><small>{row.track?.item?.title ?? '44OS'}</small></span><button type="button" className="playlist-reorder-button" aria-label="Move up" onClick={() => void move(index, -1)}>☰</button><button type="button" className="playlist-reorder-button" aria-label="Move down" onClick={() => void move(index, 1)}>⌄</button></div>)}</div>;
}

export function PlaylistAddTrackApp({ playlistId }: { playlistId: string }) {
  const { user, loading } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<CatalogTrackCursor | null>(null);
  const [loadedPlaylistKey, setLoadedPlaylistKey] = useState('');
  const [loadedBrowseKey, setLoadedBrowseKey] = useState('');
  const [error, setError] = useState('');
  const browseGeneration = useRef(0);
  const playlistKey = user ? `${user.id}:${playlistId}` : '';
  const browseKey = user ? `${user.id}:${query.trim()}` : '';
  const needsSearch = !query.trim();
  const tracksLoading = !needsSearch && loadedBrowseKey !== browseKey;
  const playlistLoading = loading || !user || loadedPlaylistKey !== playlistKey;
  useTopbarBack({ href: `/library/playlists/${playlistId}`, label: 'Playlist' });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getPlaylist(user.id, playlistId)
      .then(nextPlaylist => {
        if (!cancelled) setPlaylist(nextPlaylist);
      })
      .catch(errorValue => {
        if (!cancelled) setError(errorValue instanceof Error ? errorValue.message : 'Could not load playlist.');
      })
      .finally(() => {
        if (!cancelled) setLoadedPlaylistKey(`${user.id}:${playlistId}`);
      });
    return () => { cancelled = true; };
  }, [playlistId, user]);

  useEffect(() => {
    if (!user) return;
    const generation = ++browseGeneration.current;
    let cancelled = false;
    const searchQuery = query.trim();
    if (!searchQuery) return;
    const searchKey = `${user.id}:${searchQuery}`;
    const timer = window.setTimeout(() => {
      setError('');
      void browseCatalogTracks(searchQuery, null, 30)
        .then(page => {
          if (cancelled || generation !== browseGeneration.current) return;
          setTracks(page.items);
          setNextCursor(page.next_cursor);
          setLoadedBrowseKey(searchKey);
        })
        .catch(errorValue => {
          if (!cancelled && generation === browseGeneration.current) {
            setError(errorValue instanceof Error ? errorValue.message : 'Could not load tracks.');
            setLoadedBrowseKey(searchKey);
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, user]);

  const existing = new Set((playlist?.tracks ?? []).map(row => row.track_id));

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    const generation = browseGeneration.current;
    setLoadingMore(true);
    setError('');
    try {
      const page = await browseCatalogTracks(query.trim(), nextCursor, 30);
      if (generation !== browseGeneration.current) return;
      setTracks(current => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (errorValue) {
      if (generation === browseGeneration.current) setError(errorValue instanceof Error ? errorValue.message : 'Could not load more tracks.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function add(track: CatalogTrack) {
    if (!playlist || existing.has(track.id)) return;
    setBusy(track.id); setError('');
    try {
      await addTrackToPlaylist(track.id, playlist.id);
      const refreshed = await getPlaylist(user!.id, playlistId);
      if (!refreshed) throw new Error('Playlist no longer exists.');
      setPlaylist(refreshed);
    }
    catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : 'This track could not be added.'); }
    finally { setBusy(null); }
  }
  if (loading) return <PageShell><CenteredMessage status>Loading playlist…</CenteredMessage></PageShell>;
  if (!user) return <PageShell><EmptyMessage>Sign in to add tracks to a playlist.</EmptyMessage></PageShell>;
  if (playlistLoading) return <PageShell><CenteredMessage status>{error || 'Loading playlist…'}</CenteredMessage></PageShell>;
  if (!playlist) return <PageShell><CenteredMessage status>{error || 'Playlist not found.'}</CenteredMessage></PageShell>;

  return <PageShell><main className="playlist-add-page">
    <input className="playlist-track-search" value={query} onChange={event => { setQuery(event.target.value); setError(''); }} placeholder="Search tracks or creators" aria-label="Search tracks or creators" />
    {!needsSearch && tracksLoading ? <CenteredMessage status>Searching tracks…</CenteredMessage> : null}
    {!needsSearch && !tracksLoading && !error && !tracks.length ? <EmptyMessage>No published tracks match your search.</EmptyMessage> : null}
    {needsSearch ? <EmptyMessage>Search by track or creator to find tracks to add to this playlist.</EmptyMessage> : null}
    {!needsSearch && !tracksLoading && !error ? <div className="playlist-catalog-track-list">{tracks.map(track => <div className={`playlist-catalog-track${track.has_access ? '' : ' playlist-catalog-track-no-access'}`} key={track.id}>
      <span className="playlist-catalog-art" style={track.item?.cover_url ? { backgroundImage: `url(${track.item.cover_url})` } : undefined} />
      <span className="playlist-track-copy"><strong>{track.title}</strong><small>{track.item?.title ?? '44OS'} · <span className={track.has_access ? 'playlist-catalog-access' : 'playlist-catalog-access playlist-catalog-access-missing'}>{track.has_access ? 'Library access' : 'No Library access'}</span></small></span>
      <button type="button" aria-label={existing.has(track.id) ? `${track.title} is already in this playlist` : `Add ${track.title}${track.has_access ? '' : ' without Library access'}`} disabled={busy === track.id || existing.has(track.id)} onClick={() => void add(track)}>{existing.has(track.id) ? '✓' : busy === track.id ? '…' : '+'}</button>
    </div>)}</div> : null}
    {!needsSearch && !tracksLoading && !error && nextCursor ? <OS44Button className="playlist-catalog-load-more" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Load more tracks'}</OS44Button> : null}
    {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
  </main></PageShell>;
}
