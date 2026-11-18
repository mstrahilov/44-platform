'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, HubSection, EmptyMessage } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { useTopbarOverflow } from '@/components/TopbarContext';
import { PlaylistPicker } from '@/components/PlaylistPicker';
import { useAuth } from '@/lib/useAuth';
import {
  getSyncedRadioPlayback,
  loadRadioBundle,
  radioArtistHref,
  type RadioBundle,
  type RadioPlayableTrack,
} from '@/lib/radio';
import { radioRotationDayKey } from '@/lib/radioRotation';
import { OS44Button } from '@/components/OS44Button';
import { artworkBackdrop, DETAIL_ARTWORK_SIZES, PublicArtwork } from '@/components/PublicArtwork';

const REFRESH_MS = 15000;

export default function RadioPage() {
  const { playQueue, currentTrack, isPlaying, toggleRadioPlayback } = useMusicPlayer();
  const { user } = useAuth();
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<RadioBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    let loadedDayKey = '';

    async function load() {
      const loadedAt = new Date();
      const nextBundle = await loadRadioBundle(loadedAt);
      if (!alive) return;
      loadedDayKey = radioRotationDayKey(loadedAt);
      setBundle(nextBundle);
      setNow(loadedAt);
      setLoading(false);
    }

    void load();
    const timer = window.setInterval(() => {
      const nextNow = new Date();
      setNow(nextNow);
      if (radioRotationDayKey(nextNow) !== loadedDayKey) void load();
    }, REFRESH_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const handlePageShow = () => void load();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const playback = useMemo(
    () => (bundle ? getSyncedRadioPlayback({ tracks: bundle.tracks, now }) : { index: -1, offsetSeconds: 0 }),
    [bundle, now],
  );

  const queue = useMemo<MusicQueueTrack[]>(
    () => (bundle?.tracks ?? []).map(track => toQueueTrack(track)),
    [bundle?.tracks],
  );

  const syncedTrack = playback.index >= 0 ? bundle?.tracks[playback.index] ?? null : null;
  const heroImage = syncedTrack?.coverUrl ?? null;
  const heroStyle = heroImage ? { backgroundImage: artworkBackdrop(heroImage) } : undefined;
  const isCurrentSyncedTrack = currentTrack?.id === syncedTrack?.trackId;
  const isSyncedTrackLive = isCurrentSyncedTrack && isPlaying;

  useTopbarOverflow(useMemo(() => [
    { id: 'share', label: 'Share', onSelect: () => { void navigator.clipboard?.writeText(window.location.href); } },
    ...(syncedTrack?.trackId ? [{
      id: 'playlist',
      label: 'Add to Playlist',
      disabled: !user,
      onSelect: () => setPlaylistTrackId(syncedTrack.trackId),
    }] : []),
  ], [syncedTrack, user]));

  function handlePlayLive() {
    if (!queue.length || playback.index < 0) return;
    playQueue(queue, playback.index, playback.offsetSeconds);
  }

  function handleRadioAction() {
    if (isCurrentSyncedTrack && isPlaying) {
      toggleRadioPlayback();
      return;
    }
    handlePlayLive();
  }

  return (
    <PageShell>
      {playlistTrackId && user ? <PlaylistPicker userId={user.id} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
      <main className="radio-page">
        {loading ? (
          <div className="radio-loading-state" role="status" aria-live="polite">
            <EmptyMessage status>Loading Radio…</EmptyMessage>
          </div>
        ) : bundle?.requiresSetup ? (
          <HubSection title="Radio Setup">
            <Ui44Panel overflow="visible" className="radio-setup-card">
              <div className="radio-setup-copy">
                <h2 className="os-type-panel-title">Radio needs its playlist table first.</h2>
                <p className="os-type-body">
                  Apply the reviewed Radio SQL to create the playlist and import existing uploaded tracks.
                </p>
                {bundle.status ? <p className="os-type-body-small">{bundle.status}</p> : null}
              </div>
              <div className="radio-setup-actions">
                <OS44Button href="/studio/radio" className="os-button os-button-primary">Open Radio Studio</OS44Button>
              </div>
            </Ui44Panel>
          </HubSection>
        ) : (
          <>
            {bundle?.status ? (
              <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error ui44-status-block" role="alert">
                {bundle.status}
              </div>
            ) : null}

            <section
              className={heroImage ? 'view-album-header radio-hero' : 'view-album-header view-album-header-fallback radio-hero'}
              style={heroStyle}
              aria-label="Now Playing"
            >
              <div className="view-album-eyebrow radio-hero-kicker">Now Playing</div>
              {syncedTrack ? (
                <Link href={withRadioSource(syncedTrack.releaseHref)} className="view-album-cover radio-hero-cover" aria-label={`Open ${syncedTrack.releaseTitle}`}>
                  {syncedTrack.coverUrl ? (
                    <PublicArtwork src={syncedTrack.coverUrl} alt="" sizes={DETAIL_ARTWORK_SIZES} loading="eager" fetchPriority="high" />
                  ) : null}
                </Link>
              ) : (
                <div className="view-album-cover radio-hero-cover radio-hero-cover-empty" aria-hidden="true" />
              )}

              <div className="view-album-copy radio-hero-copy">
                <div className="view-album-eyebrow radio-hero-eyebrow">Now Playing</div>
                {syncedTrack ? (
                  <Link href={withRadioSource(syncedTrack.trackHref)} className="radio-now-title-link">
                    <h1 className="view-album-title radio-hero-title">{syncedTrack.title}</h1>
                  </Link>
                ) : (
                  <h1 className="view-album-title radio-hero-title">No track in rotation</h1>
                )}

                {syncedTrack ? (
                  <Link href={withRadioSource(radioArtistHref(syncedTrack))} className="library-creator-chip radio-hero-artist">
                    {syncedTrack.artistName}
                  </Link>
                ) : null}

                <div className="view-album-actions radio-hero-actions">
                  <OS44Button
                    type="button"
                    className="os-button os-button-primary"
                    onClick={handleRadioAction}
                    disabled={!queue.length || playback.index < 0}
                  >
                    {isSyncedTrackLive ? 'Stop Radio' : 'Play Radio'}
                  </OS44Button>
                  {syncedTrack ? (
                    <OS44Button
                      type="button"
                      className="os-button radio-desktop-playlist-action"
                      onClick={() => setPlaylistTrackId(syncedTrack.trackId)}
                      disabled={!user}
                    >
                      Add to Playlist
                    </OS44Button>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </PageShell>
  );
}

function withRadioSource(href: string) {
  return `${href}${href.includes('?') ? '&' : '?'}source=radio`;
}

function toQueueTrack(track: RadioPlayableTrack): MusicQueueTrack {
  return {
    id: track.trackId,
    title: track.title,
    artist: track.artistName,
    releaseTitle: track.releaseTitle,
    artworkUrl: track.coverUrl,
    audioUrl: track.audioUrl,
    durationSeconds: track.durationSeconds,
    productId: track.productId,
    playbackMode: 'radio',
  };
}
