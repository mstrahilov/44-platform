'use client';

import { useEffect, useMemo, useState } from 'react';
import { FilterPopover } from '@/components/FilterPopover';
import { PlaylistTrackList } from '@/components/PlaylistTrackList';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { DetailPageHeader } from '@/components/LibraryDetailPrimitives';
import { CenteredMessage, PageShell } from '@/components/Ui';
import { useTopbarBack, useTopbarTitle } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { isSavedMusicContractMissing, listSavedMusicTracks, type SavedMusicTrack } from '@/lib/domain/library';
import { creatorHref } from '@/lib/platform';
import { productBrowseHref } from '@/lib/experience';
import { PlaylistPicker } from '@/components/PlaylistPicker';

type SavedTracksSort = 'recently-added' | 'release-date';

function compareReleaseDate(left: string | null | undefined, right: string | null | undefined) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.localeCompare(left);
}

export function SavedTracksLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<SavedMusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortMode, setSortMode] = useState<SavedTracksSort>('recently-added');
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const { currentTrack, isPlaying, queueNext, toggleTrack } = useMusicPlayer();

  useTopbarTitle('');
  useTopbarBack({ href: '/library/music', label: 'Music', alwaysNavigate: true });

  useEffect(() => {
    document.body.classList.add('playlist-detail-route');
    return () => { document.body.classList.remove('playlist-detail-route'); };
  }, []);

  useEffect(() => {
    const active = sortMode !== 'recently-added';
    window.dispatchEvent(new CustomEvent('44:library-sort-state', { detail: { active } }));
    return () => { window.dispatchEvent(new CustomEvent('44:library-sort-state', { detail: { active: false } })); };
  }, [sortMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTracks([]);
      setLoading(false);
      return;
    }

    let live = true;
    setLoading(true);
    setError('');
    void listSavedMusicTracks(user.id).then(rows => {
      if (live) setTracks(rows);
    }).catch(reason => {
      if (!live) return;
      if (isSavedMusicContractMissing(reason)) {
        setTracks([]);
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Could not load Saved Tracks.');
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [authLoading, user]);

  const sortedTracks = useMemo(() => [...tracks].sort((left, right) => {
    if (sortMode === 'release-date') {
      return compareReleaseDate(left.product.release_date, right.product.release_date)
        || right.saved_at.localeCompare(left.saved_at)
        || left.number - right.number
        || left.title.localeCompare(right.title);
    }
    return right.saved_at.localeCompare(left.saved_at)
      || left.number - right.number
      || left.title.localeCompare(right.title);
  }), [sortMode, tracks]);

  const queue = useMemo<MusicQueueTrack[]>(() => sortedTracks.filter(track => track.audio_url).map(track => {
    const creatorName = track.product.creators?.display_name || track.product.creator || '44 Creator';
    return {
      id: track.track_id,
      title: track.title,
      artist: creatorName,
      releaseTitle: track.product.title,
      artworkUrl: track.product.cover_url || track.product.hero_url || null,
      audioUrl: track.audio_url!,
      durationSeconds: track.duration_seconds,
      productId: track.item_id,
      artistHref: creatorHref(track.product.creators ?? track.product.creator),
      releaseHref: `/library/music/${track.item_id}`,
    };
  }), [sortedTracks]);

  function shareTrack(track: SavedMusicTrack) {
    const url = typeof window !== 'undefined' ? new URL(productBrowseHref(track.product), window.location.origin) : null;
    if (!url) return;
    url.searchParams.set('track', track.track_id);
    if (user?.id) url.searchParams.set('ref', user.id);
    void navigator.clipboard?.writeText(url.toString());
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Track link copied to clipboard' } }));
  }

  if (authLoading || loading) return <CenteredMessage status>Loading Saved Tracks…</CenteredMessage>;
  if (!user) return <CenteredMessage status>Sign in to view Saved Tracks.</CenteredMessage>;

  return <PageShell><main className="view-detail-single library-detail-page playlist-detail-page saved-tracks-detail-page">
    {playlistTrackId ? <PlaylistPicker userId={user.id} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
    <DetailPageHeader
      title="Saved Tracks"
      creatorName="44OS"
      creatorTone="secondary"
      meta={['Playlist']}
      showCreatorIdentity={false}
      artworkFallback={<span className="playlist-detail-art-fallback library-saved-tracks-artwork-icon" aria-hidden="true">♫</span>}
      coverClassName="library-saved-tracks-cover"
    />
    <div className="library-collection-actions saved-tracks-sort">
      <FilterPopover label="Sort Saved Tracks" active={sortMode !== 'recently-added'} hideTrigger popoverClassName="library-sort-popover">
        {({ close }) => <div role="menu" aria-label="Sort Saved Tracks" className="library-sort-options">
          {([['recently-added', 'Recently Added'], ['release-date', 'Release Date']] as const).map(([value, label]) => <button key={value} type="button" role="menuitemradio" aria-checked={sortMode === value} className={sortMode === value ? 'ui44-paper-menu-item ui44-paper-menu-item-selected' : 'ui44-paper-menu-item'} onClick={() => { setSortMode(value); close(); }}><span aria-hidden="true">{sortMode === value ? '✓' : '◯'}</span>{label}</button>)}
        </div>}
      </FilterPopover>
    </div>
    {error ? <p role="alert" className="ui44-status ui44-status-error">{error}</p> : null}
    {sortedTracks.length ? <PlaylistTrackList label="Saved tracks" rows={sortedTracks.map((track, index) => {
        const queueIndex = queue.findIndex(item => item.id === track.track_id);
        const active = currentTrack?.id === track.track_id;
        const creatorName = track.product.creators?.display_name || track.product.creator || '44 Creator';
        return {
          id: track.track_id,
          number: index + 1,
          title: track.title,
          artist: creatorName,
          artistHref: creatorHref(track.product.creators ?? track.product.creator),
          actions: [
            { id: 'playlist', label: 'Add to Playlist', onSelect: () => setPlaylistTrackId(track.track_id) },
            { id: 'queue', label: 'Add to Queue', onSelect: () => { if (queueIndex >= 0) queueNext(queue[queueIndex]); }, disabled: queueIndex < 0 },
            { id: 'share', label: 'Share', onSelect: () => shareTrack(track) },
          ],
          onPlay: queueIndex >= 0 ? () => toggleTrack(queue, queueIndex) : undefined,
          active,
          playing: active && isPlaying,
        };
      })} className="saved-tracks-track-list" /> : <p className="ui44-status saved-tracks-empty">{error ? '' : 'No saved tracks yet. Save a music release to start listening.'}</p>}
  </main></PageShell>;
}
