'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, GlassPanel, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import {
  getSyncedRadioPlayback,
  loadRadioBundle,
  radioArtistHref,
  type RadioBundle,
  type RadioPlayableTrack,
} from '@/lib/radio';

const REFRESH_MS = 15000;

export default function RadioPage() {
  const { playQueue, currentTrack, isPlaying, clear, togglePlayback } = useMusicPlayer();
  const [bundle, setBundle] = useState<RadioBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;

    async function load() {
      const nextBundle = await loadRadioBundle();
      if (!alive) return;
      setBundle(nextBundle);
      setLoading(false);
    }

    void load();
    const timer = window.setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
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
  const isCurrentSyncedTrack = currentTrack?.id === syncedTrack?.trackId;
  const isSyncedTrackLive = isCurrentSyncedTrack && isPlaying;

  function handlePlayLive() {
    if (!queue.length || playback.index < 0) return;
    playQueue(queue, playback.index, playback.offsetSeconds);
  }

  function handleRadioAction() {
    if (isSyncedTrackLive) {
      clear();
      return;
    }
    if (isCurrentSyncedTrack) {
      togglePlayback();
      return;
    }
    handlePlayLive();
  }

  return (
    <PageShell>
      <main className="app-page">
        <HubHero
          title="44 Radio"
          copy="Tune in to 44 Radio, a live 24/7 station playing around the world."
          actions={(
            <button
              type="button"
              className="os-button os-button-primary"
              onClick={handleRadioAction}
              disabled={!queue.length || playback.index < 0}
            >
              {isSyncedTrackLive ? 'Stop' : 'Play Live'}
            </button>
          )}
        />

        {loading ? (
          <HubSection title="Now Playing">
            <EmptyMessage>Loading Radio…</EmptyMessage>
          </HubSection>
        ) : bundle?.requiresSetup ? (
          <HubSection title="Radio Setup">
            <GlassPanel className="radio-setup-card">
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
            </GlassPanel>
          </HubSection>
        ) : (
          <>
            {bundle?.status ? (
              <div className="dashboard-status dashboard-status-error" style={{ marginBottom: 'var(--os-space-5)' }}>
                {bundle.status}
              </div>
            ) : null}

            <GlassPanel className="radio-now-card">
                {syncedTrack ? (
                  <div className="radio-now-layout">
                    <Link href={syncedTrack.releaseHref} className="radio-now-art" aria-label={`Open ${syncedTrack.releaseTitle}`}>
                      {syncedTrack.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={syncedTrack.coverUrl} alt="" />
                      ) : null}
                    </Link>
                    <div className="radio-now-info">
                      <div className="radio-now-eyebrow">Now Playing</div>
                      <Link href={syncedTrack.trackHref} className="radio-now-title-link">
                        <div className="radio-now-title">{syncedTrack.title}</div>
                      </Link>
                      <div className="radio-now-meta">
                        <Link href={radioArtistHref(syncedTrack)} className="radio-now-artist-link">
                          <span className="radio-now-avatar">
                            {syncedTrack.artistAvatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={syncedTrack.artistAvatarUrl} alt="" />
                            ) : null}
                          </span>
                          {syncedTrack.artistName}
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="radio-now-eyebrow">Now Playing</div>
                    <div className="radio-now-title">No track in rotation</div>
                  </>
                )}
              </GlassPanel>
          </>
        )}
      </main>
    </PageShell>
  );
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
