'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type MusicQueueTrack = {
  id: string;
  title: string;
  artist: string;
  releaseTitle?: string | null;
  artworkUrl?: string | null;
  audioUrl: string;
  durationSeconds?: number | null;
  productId?: string | null;
  playbackMode?: 'standard' | 'radio';
};

export const MUSIC_TRACK_STARTED_EVENT = '44:music-track-started';
export const MUSIC_TRACK_COMPLETED_EVENT = '44:music-track-completed';

export type MusicTrackPlaybackEventDetail = {
  track: MusicQueueTrack;
  trackId: string;
  productId: string | null;
  index: number;
  reason: 'manual' | 'queue' | 'auto' | 'next' | 'previous';
};

type MusicPlayerContextValue = {
  queue: MusicQueueTrack[];
  currentTrack: MusicQueueTrack | null;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackError: string;
  playQueue: (tracks: MusicQueueTrack[], index?: number, startTimeSeconds?: number) => void;
  toggleTrack: (tracks: MusicQueueTrack[], index: number) => void;
  queueNext: (track: MusicQueueTrack) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  clear: () => void;
};

type StartTrack = (
  nextQueue: MusicQueueTrack[],
  index: number,
  reason?: MusicTrackPlaybackEventDetail['reason'],
  startTimeSeconds?: number,
) => void;

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

function formatPlayerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicQueueTrack[]>([]);
  const currentIndexRef = useRef(-1);
  const startTrackRef = useRef<StartTrack>(() => {});
  const [queue, setQueue] = useState<MusicQueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState('');

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1;
      audioRef.current.muted = false;
    }

    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const completedIndex = currentIndexRef.current;
      const completedTrack = queueRef.current[completedIndex];
      if (completedTrack) emitMusicTrackEvent(MUSIC_TRACK_COMPLETED_EVENT, completedTrack, completedIndex, 'auto');
      const nextIndex = currentIndexRef.current + 1;
      const nextTrack = queueRef.current[nextIndex];
      if (nextTrack) {
        startTrackRef.current(queueRef.current, nextIndex, 'auto');
        return;
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.src !== currentTrack.audioUrl) {
      audio.pause();
      audio.src = currentTrack.audioUrl;
      audio.volume = volume;
      audio.muted = muted;
      audio.load();
      setCurrentTime(0);
      setDuration(currentTrack.durationSeconds ?? 0);
    }

    if (isPlaying) {
      void audio.play().catch(error => {
        setPlaybackError(error instanceof Error ? error.message : 'Playback failed.');
        setIsPlaying(false);
      });
    }
  }, [currentTrack, isPlaying, muted, volume]);

  function startTrack(
    nextQueue: MusicQueueTrack[],
    index: number,
    reason: MusicTrackPlaybackEventDetail['reason'] = 'manual',
    startTimeSeconds = 0,
  ) {
    const playable = nextQueue.filter(track => track.audioUrl);
    if (!playable.length) return;

    const nextIndex = Math.max(0, Math.min(index, playable.length - 1));
    const nextTrack = playable[nextIndex];
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.preload = 'auto';
    audio.src = nextTrack.audioUrl;
    audio.volume = volume <= 0 ? 1 : volume;
    audio.muted = false;
    audio.load();
    if (startTimeSeconds > 0) {
      const applyStartTime = () => {
        try {
          audio.currentTime = startTimeSeconds;
        } catch {
          // Ignore seek timing errors; playback still starts at the beginning.
        }
      };
      audio.addEventListener('loadedmetadata', applyStartTime, { once: true });
      audio.addEventListener('canplay', applyStartTime, { once: true });
    }

    setPlaybackError('');
    queueRef.current = playable;
    currentIndexRef.current = nextIndex;
    setQueue(playable);
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setDuration(nextTrack.durationSeconds ?? 0);
    setMuted(false);
    if (volume <= 0) setVolumeState(1);
    setIsPlaying(true);
    emitMusicTrackEvent(MUSIC_TRACK_STARTED_EVENT, nextTrack, nextIndex, reason);
    void audio.play().catch(error => {
      setPlaybackError(error instanceof Error ? error.message : 'Playback failed.');
      setIsPlaying(false);
    });
  }

  useEffect(() => {
    startTrackRef.current = startTrack;
  });

  function playQueue(nextQueue: MusicQueueTrack[], index = 0, startTimeSeconds = 0) {
    startTrack(nextQueue, index, 'queue', startTimeSeconds);
  }

  function toggleTrack(nextQueue: MusicQueueTrack[], index: number) {
    const nextTrack = nextQueue[index];
    if (!nextTrack?.audioUrl) return;

    if (currentTrack?.id === nextTrack.id) {
      togglePlayback();
      return;
    }

    startTrack(nextQueue, index, 'manual');
  }

  function queueNext(track: MusicQueueTrack) {
    if (!track.audioUrl) return;
    const currentQueue = queueRef.current;
    if (currentIndexRef.current < 0 || currentQueue.length === 0) {
      startTrack([track], 0, 'queue');
      return;
    }

    const nextQueue = currentQueue.filter(item => item.id !== track.id);
    nextQueue.splice(currentIndexRef.current + 1, 0, track);
    queueRef.current = nextQueue;
    setQueue(nextQueue);
    setPlaybackError('');
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setPlaybackError('');
    setIsPlaying(true);
    void audio.play().catch(error => {
      setPlaybackError(error instanceof Error ? error.message : 'Playback failed.');
      setIsPlaying(false);
    });
  }

  function setVolume(nextVolume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(normalizedVolume);
    setMuted(normalizedVolume === 0);
  }

  function toggleMute() {
    setMuted(current => !current);
    if (volume === 0) setVolumeState(1);
  }

  function playNext() {
    if (!queue.length) return;
    startTrack(queue, Math.min(queue.length - 1, currentIndex + 1), 'next');
  }

  function playPrevious() {
    const audio = audioRef.current;
    if (!queue.length) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    startTrack(queue, Math.max(0, currentIndex - 1), 'previous');
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, duration || 0));
    setCurrentTime(audio.currentTime);
  }

  function clear() {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.removeAttribute('src');
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError('');
  }

  const value: MusicPlayerContextValue = {
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackError,
    playQueue,
    toggleTrack,
    queueNext,
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleMute,
    clear,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} aria-hidden="true" />
    </MusicPlayerContext.Provider>
  );
}

function emitMusicTrackEvent(
  name: typeof MUSIC_TRACK_STARTED_EVENT | typeof MUSIC_TRACK_COMPLETED_EVENT,
  track: MusicQueueTrack,
  index: number,
  reason: MusicTrackPlaybackEventDetail['reason'],
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MusicTrackPlaybackEventDetail>(name, {
    detail: {
      track,
      trackId: track.id,
      productId: track.productId ?? null,
      index,
      reason,
    },
  }));
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  return context;
}

export function MusicPlayerBar() {
  const {
    currentTrack,
    currentIndex,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackError,
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleMute,
    clear,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const effectiveDuration = duration || currentTrack.durationSeconds || 0;
  const isRadioPlayback = currentTrack.playbackMode === 'radio';
  const playerClassName = isRadioPlayback ? 'music-player-bar music-player-bar-radio' : 'music-player-bar';

  return (
    <div className={playerClassName} role="region" aria-label="Music player">
      <div className="music-player-art">
        {currentTrack.artworkUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentTrack.artworkUrl} alt="" />
        )}
      </div>
      <div className="music-player-copy">
        <div className="music-player-title">{currentTrack.title}</div>
        <div className="music-player-subtitle">
          {playbackError || `${currentTrack.artist}${currentTrack.releaseTitle ? ` - ${currentTrack.releaseTitle}` : ''}`}
        </div>
      </div>
      {!isRadioPlayback ? (
        <>
          <div className="music-player-controls">
            <button type="button" className="music-player-button" onClick={playPrevious} aria-label="Previous track" disabled={currentIndex <= 0}>
              <span aria-hidden="true">|&lt;</span>
            </button>
            <button type="button" className="music-player-button music-player-button-primary" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
              <span aria-hidden="true">{isPlaying ? 'II' : '>'}</span>
            </button>
            <button type="button" className="music-player-button" onClick={playNext} aria-label="Next track" disabled={currentIndex >= queue.length - 1}>
              <span aria-hidden="true">&gt;|</span>
            </button>
          </div>
          <div className="music-player-progress">
            <span>{formatPlayerTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(1, Math.round(effectiveDuration))}
              value={Math.min(Math.round(currentTime), Math.max(1, Math.round(effectiveDuration)))}
              onChange={event => seek(Number(event.target.value))}
              aria-label="Playback position"
            />
            <span>{formatPlayerTime(effectiveDuration)}</span>
          </div>
        </>
      ) : null}
      <div className="music-player-volume">
        <button type="button" className="music-player-button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted || volume === 0 ? 'Muted' : 'Vol'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={event => setVolume(Number(event.target.value))}
          aria-label="Volume"
        />
      </div>
      {isRadioPlayback ? (
        <button type="button" className="music-player-button music-player-button-primary" onClick={clear} aria-label="Stop live radio">
          Stop
        </button>
      ) : (
        <button type="button" className="music-player-close" onClick={clear} aria-label="Close player">
          Close
        </button>
      )}
    </div>
  );
}
