'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMusicPlayer, useMusicPlayerTime, type MusicQueueTrack } from '@/components/MusicPlayer';
import type { SamplePackFile, SamplePlaybackProgress } from '@/lib/domain/nativeContent';
import { listSampleProgress, saveSampleProgress } from '@/lib/domain/nativeContent';
import { ItemTrackList } from '@/components/ItemTrackList';

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
  const { currentTrack, isPlaying, duration, playQueue, toggleTrack } = useMusicPlayer();
  const currentTime = useMusicPlayerTime();
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

  return <div className={library ? 'view-section view-tracklist-section sample-pack-experience' : 'sample-pack-experience'}>
    {samples.length === 0 ? (
      <p className="app-empty-text">No sample previews have been added yet.{library && fullPackUrl ? ' The full pack is ready to download.' : ''}</p>
    ) : <ItemTrackList label="Sample tracks" rows={samples.map((sample, index) => {
      const active = currentTrack?.id === sample.id;
      const downloadUrl = sample.source_asset_id ? signedDownloads[sample.source_asset_id] : undefined;
      return {
        id: sample.id,
        number: index + 1,
        title: sample.title,
        playable: Boolean(sample.preview_url),
        active,
        playing: active && isPlaying,
        onPlay: () => toggleSample(sample),
        actions: [
          ...(downloadUrl ? [{ id: 'download', label: 'Download', href: downloadUrl, download: true }] : []),
          { id: 'preview', label: active && isPlaying ? 'Pause' : 'Play', onSelect: () => toggleSample(sample), disabled: !sample.preview_url },
        ],
      };
    })} />}
  </div>;
}
