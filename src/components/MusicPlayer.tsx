'use client';

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  playQueue: (tracks: MusicQueueTrack[], index?: number, startTimeSeconds?: number) => void;
  toggleTrack: (tracks: MusicQueueTrack[], index: number) => void;
  queueNext: (track: MusicQueueTrack) => void;
  shuffleQueue: () => void;
  playQueueIndex: (index: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
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

type StoredPlayerState = {
  queue: MusicQueueTrack[];
  currentIndex: number;
  currentTime: number;
  volume: number;
  muted: boolean;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);
const MUSIC_PLAYER_STORAGE_KEY = '44-music-player-state';
const MUSIC_PLAYER_WINDOW_STATE_PREFIX = '44-music-player-state:';

function getBrowserStorage(kind: 'sessionStorage' | 'localStorage') {
  if (typeof window === 'undefined') return null;
  try {
    return window[kind] ?? null;
  } catch {
    return null;
  }
}

function safeGetStoredItem(storage: Storage | null) {
  try {
    return storage?.getItem(MUSIC_PLAYER_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function readStoredPlayerState() {
  const sessionValue = safeGetStoredItem(getBrowserStorage('sessionStorage'));
  if (sessionValue) return sessionValue;
  const localValue = safeGetStoredItem(getBrowserStorage('localStorage'));
  if (localValue) return localValue;
  if (typeof window === 'undefined') return null;
  try {
    return window.name.startsWith(MUSIC_PLAYER_WINDOW_STATE_PREFIX)
      ? window.name.slice(MUSIC_PLAYER_WINDOW_STATE_PREFIX.length)
      : null;
  } catch {
    return null;
  }
}

function writeStoredPlayerState(state: StoredPlayerState) {
  const value = JSON.stringify(state);
  for (const storage of [getBrowserStorage('sessionStorage'), getBrowserStorage('localStorage')]) {
    try {
      storage?.setItem(MUSIC_PLAYER_STORAGE_KEY, value);
    } catch {
      // Persistence is best effort only.
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.name = `${MUSIC_PLAYER_WINDOW_STATE_PREFIX}${value}`;
    } catch {
      // Persistence is best effort only.
    }
  }
}

function clearStoredPlayerState() {
  for (const storage of [getBrowserStorage('sessionStorage'), getBrowserStorage('localStorage')]) {
    try {
      storage?.removeItem(MUSIC_PLAYER_STORAGE_KEY);
    } catch {
      // Persistence is best effort only.
    }
  }
  if (typeof window !== 'undefined') {
    try {
      if (window.name.startsWith(MUSIC_PLAYER_WINDOW_STATE_PREFIX)) window.name = '';
    } catch {
      // Persistence is best effort only.
    }
  }
}

function formatPlayerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function progressPercent(currentTime: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(100, (currentTime / duration) * 100));
}

function getPlaybackErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/notallowed|user.*interact|user.*gesture|autoplay/i.test(message)) return 'Tap play to resume.';
  return message || 'Playback failed.';
}

function isValidStoredState(value: unknown): value is StoredPlayerState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<StoredPlayerState>;
  return Array.isArray(state.queue)
    && typeof state.currentIndex === 'number'
    && typeof state.currentTime === 'number'
    && typeof state.volume === 'number'
    && typeof state.muted === 'boolean';
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicQueueTrack[]>([]);
  const currentIndexRef = useRef(-1);
  const startTrackRef = useRef<StartTrack>(() => {});
  const restoreTimeRef = useRef<number | null>(null);
  const [queue, setQueue] = useState<MusicQueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [expanded, setExpandedState] = useState(false);

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
    if (typeof window === 'undefined') return;
    const restoreTimer = window.setTimeout(() => {
      try {
        const raw = readStoredPlayerState();
        const parsed = raw ? JSON.parse(raw) : null;
        if (!isValidStoredState(parsed) || parsed.queue.length === 0) return;
        const playable = parsed.queue.filter(track => track.audioUrl);
        if (playable.length === 0) return;
        const nextIndex = Math.max(0, Math.min(parsed.currentIndex, playable.length - 1));
        queueRef.current = playable;
        currentIndexRef.current = nextIndex;
        restoreTimeRef.current = Math.max(0, parsed.currentTime || 0);
        setQueue(playable);
        setCurrentIndex(nextIndex);
        setCurrentTime(restoreTimeRef.current);
        setDuration(playable[nextIndex]?.durationSeconds ?? 0);
        setVolumeState(Math.max(0, Math.min(1, parsed.volume)));
        setMuted(parsed.muted);
        setPlaybackError('Tap play to resume.');
      } catch {
        clearStoredPlayerState();
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
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
      setDuration(currentTrack.durationSeconds ?? 0);

      const restoredTime = restoreTimeRef.current;
      if (restoredTime && restoredTime > 0) {
        const applyRestoredTime = () => {
          try {
            audio.currentTime = restoredTime;
            setCurrentTime(restoredTime);
          } catch {
            setCurrentTime(0);
          } finally {
            restoreTimeRef.current = null;
          }
        };
        audio.addEventListener('loadedmetadata', applyRestoredTime, { once: true });
        audio.addEventListener('canplay', applyRestoredTime, { once: true });
      } else {
        setCurrentTime(0);
      }
    }

    if (isPlaying) {
      void audio.play().catch(error => {
        setPlaybackError(getPlaybackErrorMessage(error));
        setIsPlaying(false);
      });
    }
  }, [currentTrack, isPlaying, muted, volume]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('music-player-active', Boolean(currentTrack));
    document.body.classList.toggle('music-player-expanded', Boolean(currentTrack && expanded));
    return () => {
      document.body.classList.remove('music-player-active', 'music-player-expanded');
    };
  }, [currentTrack, expanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentTrack) {
      clearStoredPlayerState();
      return;
    }
    const state: StoredPlayerState = {
      queue,
      currentIndex,
      currentTime,
      volume,
      muted,
    };
    writeStoredPlayerState(state);
  }, [currentIndex, currentTime, currentTrack, muted, queue, volume]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;

    const artwork = currentTrack.artworkUrl
      ? [
          { src: currentTrack.artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: currentTrack.artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: currentTrack.artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.releaseTitle || '44OS',
      artwork,
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        setPlaybackError('');
        setIsPlaying(true);
        void audio.play().catch(error => {
          setPlaybackError(getPlaybackErrorMessage(error));
          setIsPlaying(false);
        });
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekto', details => {
        if (typeof details.seekTime === 'number') seek(details.seekTime);
      });
    } catch {
      // Some browsers expose Media Session metadata without every action.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, isPlaying]);

  function setExpanded(nextExpanded: boolean) {
    setExpandedState(Boolean(currentTrack) && nextExpanded);
  }

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
          setCurrentTime(startTimeSeconds);
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
    setCurrentTime(startTimeSeconds > 0 ? startTimeSeconds : 0);
    setDuration(nextTrack.durationSeconds ?? 0);
    setMuted(false);
    if (volume <= 0) setVolumeState(1);
    setIsPlaying(true);
    emitMusicTrackEvent(MUSIC_TRACK_STARTED_EVENT, nextTrack, nextIndex, reason);
    void audio.play().catch(error => {
      setPlaybackError(getPlaybackErrorMessage(error));
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

  function shuffleQueue() {
    const currentQueue = queueRef.current;
    const activeIndex = currentIndexRef.current;
    const activeTrack = currentQueue[activeIndex];
    if (!activeTrack || activeTrack.playbackMode === 'radio' || currentQueue.length < 3) return;

    const shuffled = currentQueue.filter((_, index) => index !== activeIndex);
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    const nextQueue = [activeTrack, ...shuffled];
    queueRef.current = nextQueue;
    currentIndexRef.current = 0;
    setQueue(nextQueue);
    setCurrentIndex(0);
    setPlaybackError('');
  }

  function playQueueIndex(index: number) {
    const currentQueue = queueRef.current;
    if (!currentQueue[index]) return;
    startTrack(currentQueue, index, 'queue');
  }

  function removeFromQueue(index: number) {
    const currentQueue = queueRef.current;
    const removedTrack = currentQueue[index];
    if (!removedTrack || removedTrack.playbackMode === 'radio') return;

    const nextQueue = currentQueue.filter((_, itemIndex) => itemIndex !== index);
    if (nextQueue.length === 0) {
      clear();
      return;
    }

    const activeIndex = currentIndexRef.current;
    if (index === activeIndex) {
      startTrack(nextQueue, Math.min(index, nextQueue.length - 1), 'queue');
      return;
    }

    const nextIndex = index < activeIndex ? activeIndex - 1 : activeIndex;
    queueRef.current = nextQueue;
    currentIndexRef.current = nextIndex;
    setQueue(nextQueue);
    setCurrentIndex(nextIndex);
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
      setPlaybackError(getPlaybackErrorMessage(error));
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
    const currentQueue = queueRef.current;
    if (!currentQueue.length) return;
    startTrack(currentQueue, Math.min(currentQueue.length - 1, currentIndexRef.current + 1), 'next');
  }

  function playPrevious() {
    const audio = audioRef.current;
    const currentQueue = queueRef.current;
    if (!currentQueue.length) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    startTrack(currentQueue, Math.max(0, currentIndexRef.current - 1), 'previous');
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, duration || 0));
    setCurrentTime(audio.currentTime);
    setPlaybackError(current => current === 'Tap play to resume.' ? '' : current);
  }

  function clear() {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) removeAudioSource(audio);
    queueRef.current = [];
    currentIndexRef.current = -1;
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError('');
    setExpandedState(false);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(MUSIC_PLAYER_STORAGE_KEY);
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
    expanded,
    setExpanded,
    playQueue,
    toggleTrack,
    queueNext,
    shuffleQueue,
    playQueueIndex,
    removeFromQueue,
    clearQueue: clear,
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

function removeAudioSource(audio: HTMLAudioElement) {
  audio.removeAttribute('src');
  try {
    audio.load();
  } catch {
    // Loading an empty source can throw in older WebKit builds.
  }
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

function PlayerIcon({ name }: { name: 'play' | 'pause' | 'previous' | 'next' | 'shuffle' | 'queue' | 'volume' | 'muted' | 'chevron' | 'remove' }) {
  return <span className={`music-player-icon music-player-icon-${name}`} aria-hidden="true" />;
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
    expanded,
    setExpanded,
    togglePlayback,
    shuffleQueue,
    playNext,
    playPrevious,
    playQueueIndex,
    removeFromQueue,
    seek,
    setVolume,
    toggleMute,
    clear,
  } = useMusicPlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const dragStartYRef = useRef<number | null>(null);

  if (!currentTrack) return null;

  const effectiveDuration = duration || currentTrack.durationSeconds || 0;
  const isRadioPlayback = currentTrack.playbackMode === 'radio';
  const canPlayPrevious = currentIndex > 0;
  const canPlayNext = currentIndex < queue.length - 1;
  const percent = progressPercent(currentTime, effectiveDuration);
  const subtitle = playbackError || `${currentTrack.artist}${currentTrack.releaseTitle ? ` - ${currentTrack.releaseTitle}` : ''}`;
  const playerClassName = [
    'music-player-bar',
    isRadioPlayback ? 'music-player-bar-radio' : '',
    expanded ? 'music-player-bar-expanded' : '',
  ].filter(Boolean).join(' ');

  function openExpanded() {
    setExpanded(true);
    setQueueOpen(false);
  }

  function minimizeExpanded() {
    setExpanded(false);
    setQueueOpen(false);
  }

  function onSheetPointerDown(event: React.PointerEvent<HTMLElement>) {
    dragStartYRef.current = event.clientY;
  }

  function onSheetPointerUp(event: React.PointerEvent<HTMLElement>) {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;
    if (typeof startY !== 'number') return;
    if (event.clientY - startY > 72) minimizeExpanded();
  }

  return (
    <>
      <div
        className={playerClassName}
        role="region"
        aria-label="Music player"
        style={{ '--music-progress': String(percent / 100) } as CSSProperties}
      >
        <button type="button" className="music-player-art music-player-open-target" onClick={openExpanded} aria-label="Open Now Playing">
          {currentTrack.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentTrack.artworkUrl} alt="" />
          ) : (
            <span className="music-player-art-fallback" aria-hidden="true" />
          )}
        </button>
        <button type="button" className="music-player-copy music-player-open-target" onClick={openExpanded} aria-label="Open Now Playing">
          <span className="music-player-title">{currentTrack.title}</span>
          <span className="music-player-subtitle">{subtitle}</span>
        </button>
        <div className="music-player-controls" aria-label="Playback controls">
          {!isRadioPlayback && (
            <button type="button" className="music-player-button music-player-button-icon" onClick={playPrevious} aria-label="Previous track" disabled={!canPlayPrevious}>
              <PlayerIcon name="previous" />
            </button>
          )}
          <button type="button" className="music-player-button music-player-button-primary music-player-button-icon" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
            <PlayerIcon name={isPlaying ? 'pause' : 'play'} />
          </button>
          {!isRadioPlayback && (
            <button type="button" className="music-player-button music-player-button-icon" onClick={playNext} aria-label="Next track" disabled={!canPlayNext}>
              <PlayerIcon name="next" />
            </button>
          )}
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
        <div className="music-player-volume">
          <button type="button" className="music-player-button music-player-button-icon" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <PlayerIcon name={muted || volume === 0 ? 'muted' : 'volume'} />
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
        <div className="music-player-actions">
          <button type="button" className="music-player-button music-player-button-icon" onClick={openExpanded} aria-label="Open queue">
            <PlayerIcon name="queue" />
          </button>
          {isRadioPlayback && (
            <button type="button" className="music-player-button" onClick={clear} aria-label="Stop live radio">
              Stop
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="music-player-overlay" role="presentation">
          <button type="button" className="music-player-scrim" aria-label="Minimize Now Playing" onClick={minimizeExpanded} />
          <section
            className="music-player-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Now Playing"
            onPointerDown={onSheetPointerDown}
            onPointerUp={onSheetPointerUp}
            style={{ '--music-progress': String(percent / 100) } as CSSProperties}
          >
            <div className="music-player-sheet-header">
              <button type="button" className="music-player-sheet-minimize" onClick={minimizeExpanded} aria-label="Minimize player">
                <span className="music-player-grabber" aria-hidden="true" />
                <PlayerIcon name="chevron" />
              </button>
              <div className="music-player-sheet-heading">Now Playing</div>
              <span className="music-player-sheet-header-spacer" aria-hidden="true" />
            </div>

            <div className="music-player-sheet-main">
              <div className="music-player-sheet-art">
                {currentTrack.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentTrack.artworkUrl} alt="" />
                ) : (
                  <span className="music-player-art-fallback" aria-hidden="true" />
                )}
              </div>
              <div className="music-player-sheet-copy">
                <h2>{currentTrack.title}</h2>
                <p>{subtitle}</p>
              </div>
              <div className="music-player-sheet-progress">
                <input
                  type="range"
                  min="0"
                  max={Math.max(1, Math.round(effectiveDuration))}
                  value={Math.min(Math.round(currentTime), Math.max(1, Math.round(effectiveDuration)))}
                  onChange={event => seek(Number(event.target.value))}
                  aria-label="Playback position"
                />
                <div className="music-player-sheet-times">
                  <span>{formatPlayerTime(currentTime)}</span>
                  <span>-{formatPlayerTime(Math.max(0, effectiveDuration - currentTime))}</span>
                </div>
              </div>
              <div className="music-player-sheet-controls">
                {!isRadioPlayback && (
                  <button type="button" className="music-player-sheet-button music-player-sheet-button-utility" onClick={shuffleQueue} aria-label="Shuffle queue" disabled={queue.length < 3}>
                    <PlayerIcon name="shuffle" />
                  </button>
                )}
                {!isRadioPlayback && (
                  <button type="button" className="music-player-sheet-button" onClick={playPrevious} aria-label="Previous track" disabled={!canPlayPrevious}>
                    <PlayerIcon name="previous" />
                  </button>
                )}
                <button type="button" className="music-player-sheet-button music-player-sheet-button-primary" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  <PlayerIcon name={isPlaying ? 'pause' : 'play'} />
                </button>
                {!isRadioPlayback && (
                  <button type="button" className="music-player-sheet-button" onClick={playNext} aria-label="Next track" disabled={!canPlayNext}>
                    <PlayerIcon name="next" />
                  </button>
                )}
                <button
                  type="button"
                  className={queueOpen ? 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-button-queue music-player-sheet-button-active' : 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-button-queue'}
                  onClick={() => setQueueOpen(open => !open)}
                  aria-label={queueOpen ? 'Hide queue' : 'Show queue'}
                >
                  <PlayerIcon name="queue" />
                </button>
              </div>
              {isRadioPlayback && (
                <button type="button" className="music-player-stop-button" onClick={clear}>
                  Stop Radio
                </button>
              )}
            </div>

            <div className={queueOpen ? 'music-player-queue music-player-queue-open' : 'music-player-queue'}>
              <div className="music-player-queue-head">
                <span>Queue</span>
                <span>{isRadioPlayback ? 'Live Radio' : `${queue.length} track${queue.length === 1 ? '' : 's'}`}</span>
              </div>
              <div className="music-player-queue-list">
                {queue.map((track, index) => (
                  <div key={`${track.id}:${index}`} className={index === currentIndex ? 'music-player-queue-row music-player-queue-row-active' : 'music-player-queue-row'}>
                    <button type="button" className="music-player-queue-play" onClick={() => playQueueIndex(index)} aria-label={`Play ${track.title}`}>
                      <span className="music-player-queue-art" aria-hidden="true">
                        {track.artworkUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.artworkUrl} alt="" />
                        ) : null}
                      </span>
                      <span className="music-player-queue-copy">
                        <span>{track.title}</span>
                        <span>{track.artist}{track.releaseTitle ? ` - ${track.releaseTitle}` : ''}</span>
                      </span>
                    </button>
                    {track.playbackMode !== 'radio' && (
                      <button type="button" className="music-player-queue-remove" onClick={() => removeFromQueue(index)} aria-label={`Remove ${track.title} from queue`}>
                        <PlayerIcon name="remove" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
