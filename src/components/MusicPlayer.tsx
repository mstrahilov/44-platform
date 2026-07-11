'use client';

import Link from 'next/link';
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
  artistHref?: string | null;
  releaseHref?: string | null;
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
  toggleRadioPlayback: () => void;
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
      if (window.name.startsWith(MUSIC_PLAYER_WINDOW_STATE_PREFIX)) window.name = '';
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

function trackHref(track: MusicQueueTrack) {
  if (!track.releaseHref) return null;
  const separator = track.releaseHref.includes('?') ? '&' : '?';
  return `${track.releaseHref}${separator}track=${encodeURIComponent(track.id)}`;
}

function getPlaybackErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'You are offline. Reconnect, then tap play.';
  if (/notallowed|user.*interact|user.*gesture|autoplay/i.test(message)) return 'Tap play to resume.';
  if (/abort/i.test(message)) return 'Playback was interrupted. Tap play again.';
  if (/not.?supported|source|format/i.test(message)) return 'This audio could not be loaded. Try again in a moment.';
  if (/network|fetch|connection/i.test(message)) return 'The stream was interrupted. Tap play to reconnect.';
  return 'Playback failed. Tap play to try again.';
}

function normalizeMediaUrl(url: string) {
  if (!url) return '';
  try {
    return new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.href).href;
  } catch {
    return url;
  }
}

function audioHasSource(audio: HTMLAudioElement, url: string) {
  const expected = normalizeMediaUrl(url);
  return Boolean(expected && (normalizeMediaUrl(audio.currentSrc) === expected || normalizeMediaUrl(audio.src) === expected));
}

function resetAudioSource(audio: HTMLAudioElement, url: string) {
  audio.pause();
  audio.src = url;
  audio.preload = 'metadata';
  audio.load();
}

function restoreAudioPosition(audio: HTMLAudioElement, time: number) {
  if (!Number.isFinite(time) || time <= 0) return;
  const expectedSource = normalizeMediaUrl(audio.src);
  const apply = () => {
    audio.removeEventListener('loadedmetadata', apply);
    audio.removeEventListener('canplay', apply);
    if (normalizeMediaUrl(audio.src) !== expectedSource) return;
    try {
      const safeTime = Number.isFinite(audio.duration) && time >= audio.duration - 0.25 ? 0 : time;
      audio.currentTime = safeTime;
    } catch {
      // A failed seek should not prevent playback from restarting.
    }
  };
  audio.addEventListener('loadedmetadata', apply);
  audio.addEventListener('canplay', apply);
}

function shouldRecoverAudio(audio: HTMLAudioElement) {
  return Boolean(audio.error)
    || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
}

function isInteractionRequiredError(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message : String(error || '');
  return name === 'NotAllowedError' || /notallowed|user.*interact|user.*gesture|autoplay/i.test(message);
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

function isStoredQueueTrack(value: unknown): value is MusicQueueTrack {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<MusicQueueTrack>;
  return typeof track.id === 'string'
    && typeof track.title === 'string'
    && typeof track.artist === 'string'
    && typeof track.audioUrl === 'string'
    && track.audioUrl.length > 0;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicQueueTrack[]>([]);
  const currentIndexRef = useRef(-1);
  const startTrackRef = useRef<StartTrack>(() => {});
  const restoreTimeRef = useRef<number | null>(null);
  const sourceNeedsRefreshRef = useRef(false);
  const playAttemptRef = useRef(0);
  const lastPersistedAtRef = useRef(0);
  const pendingStartEventRef = useRef<MusicTrackPlaybackEventDetail | null>(null);
  const [queue, setQueue] = useState<MusicQueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [expanded, setExpandedState] = useState(false);
  const [hasRestoredState, setHasRestoredState] = useState(false);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.preload = 'metadata';
    audio.volume = 1;
    audio.muted = false;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => {
      setIsPlaying(true);
      const pendingEvent = pendingStartEventRef.current;
      if (pendingEvent) {
        pendingStartEventRef.current = null;
        emitMusicTrackEvent(
          MUSIC_TRACK_STARTED_EVENT,
          pendingEvent.track,
          pendingEvent.index,
          pendingEvent.reason,
        );
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      sourceNeedsRefreshRef.current = true;
      setPlaybackError('Playback was interrupted. Tap play to reconnect.');
    };
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
      if (completedTrack?.playbackMode === 'radio' && queueRef.current.length > 0) {
        startTrackRef.current(queueRef.current, 0, 'auto');
        return;
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
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
        const requestedTrack = parsed.queue[parsed.currentIndex];
        const playable = parsed.queue.filter(isStoredQueueTrack).slice(0, 200);
        if (playable.length === 0) return;
        const requestedIndex = requestedTrack && isStoredQueueTrack(requestedTrack)
          ? playable.findIndex(track => track.id === requestedTrack.id)
          : -1;
        const nextIndex = requestedIndex >= 0
          ? requestedIndex
          : Math.max(0, Math.min(parsed.currentIndex, playable.length - 1));
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
      } finally {
        setHasRestoredState(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let hiddenAt = 0;
    const markRefreshAfterSuspension = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > 30_000) sourceNeedsRefreshRef.current = true;
      hiddenAt = 0;
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) sourceNeedsRefreshRef.current = true;
    };
    const handleOnline = () => {
      sourceNeedsRefreshRef.current = true;
      setPlaybackError(current => current ? 'Back online. Tap play to reconnect.' : current);
    };
    document.addEventListener('visibilitychange', markRefreshAfterSuspension);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', markRefreshAfterSuspension);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
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

    if (!audioHasSource(audio, currentTrack.audioUrl)) {
      resetAudioSource(audio, currentTrack.audioUrl);
      audio.volume = volume;
      audio.muted = muted;
      setDuration(currentTrack.durationSeconds ?? 0);

      const restoredTime = restoreTimeRef.current;
      if (restoredTime && restoredTime > 0) {
        restoreAudioPosition(audio, restoredTime);
        restoreTimeRef.current = null;
      } else {
        setCurrentTime(0);
      }
    }

  }, [currentTrack, muted, volume]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const hasVisiblePlayer = Boolean(currentTrack && currentTrack.playbackMode !== 'radio');
    document.body.classList.toggle('music-player-active', hasVisiblePlayer);
    document.body.classList.toggle('music-player-expanded', Boolean(hasVisiblePlayer && expanded));
    return () => {
      document.body.classList.remove('music-player-active', 'music-player-expanded');
    };
  }, [currentTrack, expanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasRestoredState) return;
    if (!currentTrack) {
      clearStoredPlayerState();
      return;
    }
    if (currentTrack.playbackMode === 'radio') {
      if (lastPersistedAtRef.current !== -1) clearStoredPlayerState();
      lastPersistedAtRef.current = -1;
      return;
    }
    const state: StoredPlayerState = {
      queue,
      currentIndex,
      currentTime,
      volume,
      muted,
    };
    const now = Date.now();
    if (isPlaying && currentTime > 0 && now - lastPersistedAtRef.current < 1000) return;
    lastPersistedAtRef.current = now;
    writeStoredPlayerState(state);
  }, [currentIndex, currentTime, currentTrack, hasRestoredState, isPlaying, muted, queue, volume]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;

    const artwork = currentTrack.artworkUrl
      ? [
          { src: currentTrack.artworkUrl, sizes: '96x96' },
          { src: currentTrack.artworkUrl, sizes: '256x256' },
          { src: currentTrack.artworkUrl, sizes: '512x512' },
        ]
      : [];

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.releaseTitle || '44OS',
        artwork,
      });
    } catch {
      // Metadata support varies across WebKit versions.
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        void requestPlayback(audio, currentTrack.audioUrl);
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

  async function requestPlayback(audio: HTMLAudioElement, audioUrl: string, forceRefresh = false) {
    const attempt = ++playAttemptRef.current;
    const alreadyLoaded = audioHasSource(audio, audioUrl);
    const resumeAt = alreadyLoaded ? audio.currentTime : 0;
    const needsRefresh = forceRefresh || sourceNeedsRefreshRef.current || !alreadyLoaded || shouldRecoverAudio(audio);
    if (needsRefresh) {
      resetAudioSource(audio, audioUrl);
      restoreAudioPosition(audio, resumeAt);
    }
    sourceNeedsRefreshRef.current = false;
    audio.volume = volume;
    audio.muted = muted;
    setPlaybackError('');

    try {
      await audio.play();
    } catch (error) {
      if (attempt !== playAttemptRef.current) return;
      if (isInteractionRequiredError(error)) {
        setPlaybackError(getPlaybackErrorMessage(error));
        setIsPlaying(false);
        return;
      }
      try {
        const retryAt = audio.currentTime || resumeAt;
        resetAudioSource(audio, audioUrl);
        restoreAudioPosition(audio, retryAt);
        await audio.play();
      } catch (retryError) {
        if (attempt !== playAttemptRef.current) return;
        sourceNeedsRefreshRef.current = true;
        setPlaybackError(getPlaybackErrorMessage(retryError));
        setIsPlaying(false);
      }
    }
  }

  function startTrack(
    nextQueue: MusicQueueTrack[],
    index: number,
    reason: MusicTrackPlaybackEventDetail['reason'] = 'manual',
    startTimeSeconds = 0,
  ) {
    const requestedTrack = nextQueue[index];
    const playable = nextQueue.filter(track => track.audioUrl);
    if (!playable.length) return;

    const requestedIndex = requestedTrack ? playable.findIndex(track => track.id === requestedTrack.id) : -1;
    const nextIndex = requestedIndex >= 0
      ? requestedIndex
      : Math.max(0, Math.min(index, playable.length - 1));
    const nextTrack = playable[nextIndex];
    const audio = audioRef.current;
    if (!audio) return;
    resetAudioSource(audio, nextTrack.audioUrl);
    restoreAudioPosition(audio, startTimeSeconds);

    setPlaybackError('');
    queueRef.current = playable;
    currentIndexRef.current = nextIndex;
    setQueue(playable);
    setCurrentIndex(nextIndex);
    setCurrentTime(startTimeSeconds > 0 ? startTimeSeconds : 0);
    setDuration(nextTrack.durationSeconds ?? 0);
    pendingStartEventRef.current = {
      track: nextTrack,
      trackId: nextTrack.id,
      productId: nextTrack.productId ?? null,
      index: nextIndex,
      reason,
    };
    void requestPlayback(audio, nextTrack.audioUrl);
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

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void requestPlayback(audio, currentTrack.audioUrl);
  }

  function toggleRadioPlayback() {
    const currentQueue = queueRef.current;
    const activeTrack = currentQueue[currentIndexRef.current];
    if (!activeTrack || activeTrack.playbackMode !== 'radio') return;

    if (!audioRef.current?.paused) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    const totalDuration = currentQueue.reduce((sum, track) => sum + Math.max(0, track.durationSeconds ?? 0), 0);
    if (totalDuration <= 0) {
      startTrack(currentQueue, Math.max(0, currentIndexRef.current), 'queue');
      return;
    }

    const anchorSeconds = Date.parse('2026-01-01T00:00:00.000Z') / 1000;
    const loopedSeconds = Math.max(0, Math.floor(Date.now() / 1000) - anchorSeconds) % totalDuration;
    let cursor = 0;
    for (let index = 0; index < currentQueue.length; index += 1) {
      const trackDuration = Math.max(0, currentQueue[index].durationSeconds ?? 0);
      if (loopedSeconds < cursor + trackDuration) {
        startTrack(currentQueue, index, 'queue', loopedSeconds - cursor);
        return;
      }
      cursor += trackDuration;
    }
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
    if (currentIndexRef.current >= currentQueue.length - 1) return;
    startTrack(currentQueue, currentIndexRef.current + 1, 'next');
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
    toggleRadioPlayback,
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
      <audio ref={audioRef} preload="metadata" playsInline style={{ display: 'none' }} aria-hidden="true" />
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

function PlayerIcon({ name }: { name: 'play' | 'pause' | 'stop' | 'previous' | 'next' | 'shuffle' | 'queue' | 'volume' | 'muted' | 'chevron' | 'remove' }) {
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
    toggleRadioPlayback,
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
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const dragStartYRef = useRef<number | null>(null);

  if (!currentTrack) return null;

  const effectiveDuration = duration || currentTrack.durationSeconds || 0;
  const isRadioPlayback = currentTrack.playbackMode === 'radio';
  if (isRadioPlayback) return null;
  const canPlayPrevious = currentIndex > 0;
  const canPlayNext = currentIndex < queue.length - 1;
  const percent = progressPercent(currentTime, effectiveDuration);
  const compactSubtitle = playbackError || currentTrack.artist;
  const currentTrackHref = trackHref(currentTrack);
  const showingQueue = queueOpen && !isRadioPlayback;
  const playerClassName = [
    'music-player-bar',
    isRadioPlayback ? 'music-player-bar-radio' : '',
    expanded ? 'music-player-bar-expanded' : '',
  ].filter(Boolean).join(' ');

  function openExpanded() {
    setExpanded(true);
    setQueueOpen(false);
  }

  function openQueue() {
    setExpanded(true);
    setQueueOpen(true);
  }

  function minimizeExpanded() {
    setExpanded(false);
    setQueueOpen(false);
  }

  function toggleExpandedQueue() {
    setQueueOpen(!queueOpen);
  }

  function toggleShuffle() {
    const nextEnabled = !shuffleEnabled;
    if (nextEnabled) shuffleQueue();
    setShuffleEnabled(nextEnabled);
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
          <span className="music-player-subtitle">{compactSubtitle}</span>
        </button>
        <div className="music-player-controls" aria-label="Playback controls">
          {isRadioPlayback ? (
            <button
              type="button"
              className="music-player-button music-player-button-primary music-player-button-icon music-player-radio-stop"
              onClick={toggleRadioPlayback}
              aria-label={isPlaying ? 'Pause live radio' : 'Resume live radio'}
            >
              <PlayerIcon name={isPlaying ? 'stop' : 'play'} />
            </button>
          ) : (
            <>
            <button type="button" className="music-player-button music-player-button-icon" onClick={playPrevious} aria-label="Previous track" disabled={!canPlayPrevious}>
              <PlayerIcon name="previous" />
            </button>
            <button type="button" className="music-player-button music-player-button-primary music-player-button-icon" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
              <PlayerIcon name={isPlaying ? 'pause' : 'play'} />
            </button>
            <button type="button" className="music-player-button music-player-button-icon music-player-close music-player-close-mobile" onClick={clear} aria-label="Close player">
              <PlayerIcon name="remove" />
            </button>
            <button type="button" className="music-player-button music-player-button-icon" onClick={playNext} aria-label="Next track" disabled={!canPlayNext}>
              <PlayerIcon name="next" />
            </button>
            </>
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
          {!isRadioPlayback && (
            <button type="button" className="music-player-button music-player-button-icon" onClick={openQueue} aria-label="Open queue">
              <PlayerIcon name="queue" />
            </button>
          )}
          <button type="button" className="music-player-button music-player-button-icon music-player-close music-player-close-desktop" onClick={clear} aria-label="Close player">
            <PlayerIcon name="remove" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="music-player-overlay" role="presentation">
          <button type="button" className="music-player-scrim" aria-label="Minimize Now Playing" onClick={minimizeExpanded} />
          <section
            className={showingQueue ? 'music-player-sheet music-player-sheet-queue-open' : 'music-player-sheet'}
            role="dialog"
            aria-modal="true"
            aria-label="Now Playing"
            onPointerDown={onSheetPointerDown}
            onPointerUp={onSheetPointerUp}
            style={{ '--music-progress': String(percent / 100) } as CSSProperties}
          >
            <div className="music-player-sheet-header">
              <span className="music-player-sheet-header-spacer" aria-hidden="true" />
              <span className="music-player-sheet-header-spacer" aria-hidden="true" />
              <button
                type="button"
                className="music-player-sheet-minimize"
                onClick={minimizeExpanded}
                aria-label="Close player"
              >
                <PlayerIcon name="remove" />
              </button>
            </div>

            <div className="music-player-sheet-main">
              <div className="music-player-sheet-art">
                {currentTrack.releaseHref ? <Link href={currentTrack.releaseHref} onClick={minimizeExpanded} aria-label={`Open ${currentTrack.releaseTitle || currentTrack.title}`}>
                  {currentTrack.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentTrack.artworkUrl} alt="" />
                  ) : (
                    <span className="music-player-art-fallback" aria-hidden="true" />
                  )}
                </Link> : currentTrack.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentTrack.artworkUrl} alt="" />
                ) : (
                  <span className="music-player-art-fallback" aria-hidden="true" />
                )}
              </div>
              <div className="music-player-sheet-copy">
                <h2>{currentTrackHref ? <Link href={currentTrackHref} onClick={minimizeExpanded}>{currentTrack.title}</Link> : currentTrack.title}</h2>
                <p>{currentTrack.artistHref ? <Link href={currentTrack.artistHref} onClick={minimizeExpanded}>{currentTrack.artist}</Link> : currentTrack.artist}</p>
              </div>
              {!isRadioPlayback && <div className="music-player-sheet-progress">
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
              </div>}
              <div className="music-player-sheet-controls">
                {isRadioPlayback ? (
                  <button
                    type="button"
                    className="music-player-sheet-button music-player-sheet-button-primary music-player-sheet-radio-stop"
                    onClick={toggleRadioPlayback}
                    aria-label={isPlaying ? 'Pause live radio' : 'Resume live radio'}
                  >
                    <PlayerIcon name={isPlaying ? 'stop' : 'play'} />
                  </button>
                ) : (
                  <>
                  <button
                    type="button"
                    className={shuffleEnabled ? 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-shuffle music-player-sheet-button-active' : 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-shuffle'}
                    onClick={toggleShuffle}
                    aria-label={shuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
                    aria-pressed={shuffleEnabled}
                    disabled={queue.length < 3}
                  >
                    <PlayerIcon name="shuffle" />
                  </button>
                  <button type="button" className="music-player-sheet-button" onClick={playPrevious} aria-label="Previous track" disabled={!canPlayPrevious}>
                    <PlayerIcon name="previous" />
                  </button>
                  <button type="button" className="music-player-sheet-button music-player-sheet-button-primary" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    <PlayerIcon name={isPlaying ? 'pause' : 'play'} />
                  </button>
                  <button type="button" className="music-player-sheet-button" onClick={playNext} aria-label="Next track" disabled={!canPlayNext}>
                    <PlayerIcon name="next" />
                  </button>
                  <button
                    type="button"
                    className={showingQueue ? 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-button-queue music-player-sheet-button-active' : 'music-player-sheet-button music-player-sheet-button-utility music-player-sheet-button-queue'}
                    onClick={toggleExpandedQueue}
                    aria-label={showingQueue ? 'Hide queue' : 'Show queue'}
                  >
                    <PlayerIcon name="queue" />
                  </button>
                  </>
                )}
              </div>
            </div>

            {!isRadioPlayback && <div className={showingQueue ? 'music-player-queue music-player-queue-open' : 'music-player-queue'}>
              <div className="music-player-queue-head">
                <span>Queue</span>
                <span>{isRadioPlayback ? 'Live Radio' : `${Math.max(0, queue.length - currentIndex - 1)} next`}</span>
              </div>
              <div className="music-player-queue-list">
                {queue.slice(currentIndex + 1).map((track, upcomingIndex) => {
                  const queueIndex = currentIndex + 1 + upcomingIndex;
                  return (
                  <div key={`${track.id}:${queueIndex}`} className="music-player-queue-row">
                    <button type="button" className="music-player-queue-play" onClick={() => playQueueIndex(queueIndex)} aria-label={`Play ${track.title}`}>
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
                      <button type="button" className="music-player-queue-remove" onClick={() => removeFromQueue(queueIndex)} aria-label={`Remove ${track.title} from queue`}>
                        <PlayerIcon name="remove" />
                      </button>
                    )}
                  </div>
                  );
                })}
                {queue.length - currentIndex - 1 <= 0 && (
                  <div className="music-player-queue-empty">Nothing else is queued.</div>
                )}
              </div>
            </div>}
          </section>
        </div>
      )}
    </>
  );
}
