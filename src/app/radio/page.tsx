'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, HubSection, EmptyMessage } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { PlaylistPicker } from '@/components/PlaylistPicker';
import { useTopbarLeadingAction, useTopbarOverflow, useTopbarOverlay } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import {
  getSyncedRadioPlayback,
  loadRadioBundle,
  radioArtistHref,
  type RadioBundle,
  type RadioPlayableTrack,
} from '@/lib/radio';
import { radioRotationDayKey } from '@/lib/radioRotation';
import { artworkBackdrop, DETAIL_ARTWORK_SIZES, PublicArtwork } from '@/components/PublicArtwork';

const REFRESH_MS = 15000;

export default function RadioPage() {
  const { playQueue, currentTrack, isPlaying, toggleRadioPlayback } = useMusicPlayer();
  const { user } = useAuth();
  const [bundle, setBundle] = useState<RadioBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [playlistPickerTrackId, setPlaylistPickerTrackId] = useState<string | null>(null);
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
  const ambientStyle = heroImage ? { backgroundImage: artworkBackdrop(heroImage, 400) } : undefined;
  const isCurrentSyncedTrack = currentTrack?.id === syncedTrack?.trackId;
  const isSyncedTrackLive = isCurrentSyncedTrack && isPlaying;

  const addToPlaylistAction = useMemo(() => (
    <button
      type="button"
      className="ui44-symbol-button os-topbar-icon-button"
      aria-label="Add Radio track to Playlist"
      title="Add to Playlist"
      disabled={!user || !syncedTrack}
      onClick={() => { if (syncedTrack) setPlaylistPickerTrackId(syncedTrack.trackId); }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h10M3 11h10M3 16h5" />
        <path d="M17 14V4l5-1v10" />
        <circle cx="15" cy="17" r="2" />
      </svg>
    </button>
  ), [syncedTrack, user]);

  useTopbarLeadingAction(addToPlaylistAction);
  // Radio uses the artwork-derived atmosphere as its page background. Keep the
  // shared toolbar over that atmosphere on mobile/PWA shells, just like the
  // profile and release detail surfaces.
  useTopbarOverlay(true);

  useTopbarOverflow(useMemo(() => [
    { id: 'share', label: 'Share', onSelect: () => { void navigator.clipboard?.writeText(window.location.href); } },
  ], []));

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
      {playlistPickerTrackId && user ? (
        <PlaylistPicker
          userId={user.id}
          trackId={playlistPickerTrackId}
          onClose={() => setPlaylistPickerTrackId(null)}
        />
      ) : null}
      <main className="radio-page">
        <div className="radio-artwork-background" aria-hidden="true">
          {ambientStyle ? <div className="radio-artwork-background-image" style={ambientStyle} /> : null}
          {ambientStyle ? <div className="radio-artwork-background-veil" /> : null}
        </div>
        <div className="radio-page-content">
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
                  <Link href="/studio/radio" className="os-button os-button-primary">Open Radio Studio</Link>
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
                className="radio-hero"
                aria-label="Now Playing"
              >
                <div className="view-album-eyebrow radio-hero-eyebrow">NOW PLAYING</div>
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

                  <div className="radio-hero-actions">
                    <button
                      type="button"
                      className="radio-playback-button"
                      onClick={handleRadioAction}
                      disabled={!queue.length || playback.index < 0}
                      aria-label={isSyncedTrackLive ? 'Stop Radio' : 'Play Radio'}
                    >
                      {isSyncedTrackLive ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
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
