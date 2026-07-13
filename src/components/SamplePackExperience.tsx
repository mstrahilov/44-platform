'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import type { SamplePackFile, SamplePlaybackProgress } from '@/lib/domain/nativeContent';
import { listSampleProgress, saveSampleProgress } from '@/lib/domain/nativeContent';

export function SamplePackExperience({
  itemId,
  title,
  creator,
  artworkUrl,
  samples,
  signedDownloads = {},
  fullPackUrl = null,
  library = false,
  signedIn = false,
}: {
  itemId: string;
  title: string;
  creator: string;
  artworkUrl?: string | null;
  samples: SamplePackFile[];
  signedDownloads?: Record<string, string>;
  fullPackUrl?: string | null;
  library?: boolean;
  signedIn?: boolean;
}) {
  const { currentTrack, isPlaying, currentTime, duration, playQueue, toggleTrack } = useMusicPlayer();
  const [progress, setProgress] = useState<Record<string, SamplePlaybackProgress>>({});
  const lastSavedRef = useRef<Record<string, number>>({});
  const wasPlayingRef = useRef(isPlaying);
  const queue = useMemo<MusicQueueTrack[]>(() => samples
    .filter(sample => Boolean(sample.preview_url))
    .map(sample => ({
      id: sample.id,
      title: sample.title,
      artist: creator,
      releaseTitle: title,
      artworkUrl: artworkUrl ?? null,
      audioUrl: sample.preview_url!,
      durationSeconds: sample.duration_seconds,
      productId: null,
    })), [artworkUrl, creator, samples, title]);

  useEffect(() => {
    if (!signedIn) return;
    void listSampleProgress(itemId)
      .then(rows => setProgress(Object.fromEntries(rows.map(row => [row.sample_file_id, row]))))
      .catch(() => undefined);
  }, [itemId, signedIn]);

  useEffect(() => {
    const sample = currentTrack ? samples.find(row => row.id === currentTrack.id) : null;
    if (!signedIn || !sample) {
      wasPlayingRef.current = isPlaying;
      return;
    }
    const lastSaved = lastSavedRef.current[sample.id] ?? Number(progress[sample.id]?.position_seconds ?? 0);
    const playbackPaused = wasPlayingRef.current && !isPlaying;
    if (Math.abs(currentTime - lastSaved) >= 5 || playbackPaused) {
      lastSavedRef.current[sample.id] = currentTime;
      void saveSampleProgress(sample.id, currentTime, duration || sample.duration_seconds || null).catch(() => undefined);
    }
    wasPlayingRef.current = isPlaying;
  }, [currentTime, currentTrack, duration, isPlaying, progress, samples, signedIn]);

  function toggleSample(sample: SamplePackFile) {
    const index = queue.findIndex(track => track.id === sample.id);
    if (index < 0) return;
    if (currentTrack?.id === sample.id && currentTrack.audioUrl === queue[index].audioUrl) {
      toggleTrack(queue, index);
      return;
    }
    playQueue(queue, index, Number(progress[sample.id]?.position_seconds ?? 0));
  }

  return (
    <div className={library ? 'view-section sample-pack-experience' : 'sample-pack-experience'}>
      <div className="sample-pack-heading">
        <h2 className="view-section-title">{library ? 'Pack Contents' : 'Sample Preview'}</h2>
      </div>
      {samples.length === 0 ? (
        <p className="app-empty-text">No sample previews have been added yet.{library && fullPackUrl ? ' The full pack is ready to download.' : ''}</p>
      ) : (
        <div className="view-tracklist sample-preview-list">
          {samples.map((sample, index) => {
            const active = currentTrack?.id === sample.id;
            const downloadUrl = sample.source_asset_id ? signedDownloads[sample.source_asset_id] : undefined;
            return (
              <div
                className="view-track-row sample-preview-row"
                key={sample.id}
                role="button"
                tabIndex={sample.preview_url ? 0 : -1}
                onClick={() => toggleSample(sample)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSample(sample);
                  }
                }}
              >
                <div className={active ? 'view-track-leading view-track-leading-current' : 'view-track-leading'}>
                  <span className="view-track-number">{index + 1}</span>
                  <button
                    className="view-track-play"
                    type="button"
                    disabled={!sample.preview_url}
                    aria-label={`${active && isPlaying ? 'Pause' : 'Play'} ${sample.title}`}
                    onClick={event => { event.stopPropagation(); toggleSample(sample); }}
                  >
                    <span className={active ? `view-track-icon view-track-icon-equalizer${isPlaying ? ' view-track-icon-equalizer-playing' : ''}` : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                  </button>
                </div>
                <div className={active && isPlaying ? 'view-track-title view-track-title-active' : 'view-track-title'}>{sample.title}</div>
                <div className="sample-track-actions">
                  <span className="view-track-duration">{formatTime(Number(sample.duration_seconds ?? 0))}</span>
                  {downloadUrl ? <Link className="sample-download-action" href={downloadUrl} target="_blank" rel="noreferrer" download aria-label={`Download ${sample.title}`} onClick={event => event.stopPropagation()}>↓</Link> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
