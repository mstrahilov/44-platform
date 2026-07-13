'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContextMenu } from '@/components/ContextMenu';
import { useAuth } from '@/lib/useAuth';
import { productLibraryHref } from '@/lib/experience';
import { getProductLibraryContent, getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import { creatorHref, type ProductAchievement, type Track } from '@/lib/platform';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { LibraryAchievementsSection, LibraryBonusContentSection, LibraryFilesSection, LibraryProductDetailsSection, ProductDetailHeader, withSourceProduct, type LibraryBonusAsset, type LibraryFileAsset, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { recordAchievementPlaybackSignal, trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { useTopbarBack } from '@/components/TopbarContext';
import { MUSIC_TRACK_COMPLETED_EVENT, MUSIC_TRACK_STARTED_EVENT, useMusicPlayer, type MusicQueueTrack, type MusicTrackPlaybackEventDetail } from '@/components/MusicPlayer';
import { getLibraryItemBundle, type DetailedLibraryItemRow } from '@/lib/domain/itemDetails';

type LibraryKind = 'product';

type LibraryItemRow = DetailedLibraryItemRow;

export function LibraryItemDetail({
  kind,
  id,
  backHref = '/library',
  backLabel = 'Library',
  legacyRedirect = false,
}: {
  kind: LibraryKind;
  id: string;
  backHref?: string;
  backLabel?: string;
  legacyRedirect?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  useTopbarBack({ href: backHref, label: backLabel });
  const [productRow, setProductRow] = useState<LibraryItemRow | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [bonusAssets, setBonusAssets] = useState<LibraryBonusAsset[]>([]);
  const [assets, setAssets] = useState<LibraryFileAsset[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      Promise.resolve().then(() => {
        setLoading(false);
        setError('Sign in to view this library item.');
      });
      return;
    }

    async function fetchItem(userId: string) {
      setLoading(true);
      setError(null);

      if (kind === 'product') {
        let bundle;
        try {
          bundle = await getLibraryItemBundle(userId, id);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Library item not found.');
          setLoading(false);
          return;
        }
        if (!bundle) {
          setError('Library item not found.');
          setLoading(false);
          return;
        }

        const { row } = bundle;
        setProductRow(row);

        if (legacyRedirect && row.products) {
          router.replace(productLibraryHref(row.products, row.id));
          return;
        }

        setTracks(bundle.tracks);
        setAchievements(bundle.achievements);
        setBonusAssets(bundle.assets.filter(asset => ['bonus_content', 'bonus_achievement'].includes(asset.asset_type ?? '')));
        setAssets(bundle.assets);
        setUnlockedAchievementIds(new Set(bundle.unlockedAchievements.map(item => item.achievement_id)));
      }

      setLoading(false);
    }

    fetchItem(userId);
  }, [authLoading, id, kind, legacyRedirect, router, userId]);

  if (authLoading || loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (error) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{error}</div>;
  if (!user) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Sign in to view this library item.</div>;

  if (kind === 'product' && productRow?.products) {
    return <ProductLibraryDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} assets={assets} bonusAssets={bonusAssets} unlockedAchievementIds={unlockedAchievementIds} />;
  }

  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Library item not found.</div>;
}

function ProductLibraryDetail({
  userId,
  row,
  tracks,
  achievements,
  assets,
  bonusAssets,
  unlockedAchievementIds,
}: {
  userId: string;
  row: LibraryItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  assets: LibraryFileAsset[];
  bonusAssets: LibraryBonusAsset[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const baseAction = getProductLibraryPrimaryAction(product);
  const includedFile = assets.find(asset => asset.file_url && !['bonus_content', 'bonus_achievement'].includes(asset.asset_type ?? ''));
  const action = includedFile?.file_url ? {
    ...baseAction,
    label: includedFile.asset_type === 'book' ? 'Open' : 'Download',
    href: includedFile.file_url,
  } : baseAction;
  const runtimeKind = getProductRuntimeKind(product);
  const isMusic = runtimeKind === 'music';
  const isBook = runtimeKind === 'book';
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack, queueNext } = useMusicPlayer();
  const { openContextMenu } = useContextMenu();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [completedTrackIds, setCompletedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [noSkipsEligible, setNoSkipsEligible] = useState(false);
  const [fullReleaseHandled, setFullReleaseHandled] = useState(false);
  const playbackSessionIdRef = useRef('');

  function currentPlaybackSessionId() {
    if (!playbackSessionIdRef.current) playbackSessionIdRef.current = crypto.randomUUID();
    return playbackSessionIdRef.current;
  }

  function beginPlaybackSession() {
    playbackSessionIdRef.current = crypto.randomUUID();
    return playbackSessionIdRef.current;
  }

  useEffect(() => { Promise.resolve().then(() => setCompletedTrackIds(new Set())); }, [product.id]);
  useEffect(() => { Promise.resolve().then(() => setLocalUnlockedAchievementIds(unlockedAchievementIds)); }, [unlockedAchievementIds]);
  useEffect(() => {
    const missingDurationTracks = tracks.filter(track => track.audio_url && (!track.duration_seconds || track.duration_seconds <= 0));
    if (missingDurationTracks.length === 0) return;

    let alive = true;
    const audioElements = missingDurationTracks.map(track => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = track.audio_url!;
      audio.addEventListener('loadedmetadata', () => {
        if (!alive || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        setInferredTrackDurations(current => ({
          ...current,
          [track.id]: Math.round(audio.duration),
        }));
      });
      return audio;
    });

    return () => {
      alive = false;
      audioElements.forEach(audio => {
        audio.removeAttribute('src');
        audio.load();
      });
    };
  }, [tracks]);

  const musicQueue = useMemo<MusicQueueTrack[]>(() => (
    tracks
      .filter(track => Boolean(track.audio_url))
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: product.creators?.display_name || product.creator || '44 Creator',
        releaseTitle: product.title,
        artworkUrl: product.cover_url || product.hero_url,
        audioUrl: track.audio_url!,
        durationSeconds: track.duration_seconds,
        productId: product.id,
        artistHref: creatorHref(product.creators ?? product.creator),
        releaseHref: productLibraryHref(product, row.id),
      }))
  ), [product, row.id, tracks]);
  const overachieverAchievement = achievements.find(achievement => achievement.code === 'overachiever');
  const hasOverachieverUnlocked = Boolean(overachieverAchievement && localUnlockedAchievementIds.has(overachieverAchievement.id));

  async function toggleTrack(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;

    if (currentTrack?.productId === product.id && currentTrack.id !== track.id) setNoSkipsEligible(false);
    if (trackIndex === 0 && currentTrack?.productId !== product.id) {
      beginPlaybackSession();
      setCompletedTrackIds(new Set());
      setNoSkipsEligible(true);
      setFullReleaseHandled(false);
    }
    togglePlayerTrack(musicQueue, trackIndex);
  }

  function queueTrackNext(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;
    queueNext(musicQueue[trackIndex]);
  }

  function playRelease() {
    if (!musicQueue.length) {
      runProductAction(action);
      return;
    }

    beginPlaybackSession();
    playQueue(musicQueue, 0);
    setSelectedTrackId(musicQueue[0]?.id ?? null);
    setCompletedTrackIds(new Set());
    setNoSkipsEligible(true);
    setFullReleaseHandled(false);
    setShuffleEnabled(false);
  }

  function shuffleRelease() {
    if (!musicQueue.length) return;
    if (shuffleEnabled) {
      playRelease();
      return;
    }
    beginPlaybackSession();
    const shuffled = shuffleMusicQueue(musicQueue);
    playQueue(shuffled, 0);
    setSelectedTrackId(shuffled[0]?.id ?? null);
    setCompletedTrackIds(new Set());
    setNoSkipsEligible(false);
    setFullReleaseHandled(false);
    setShuffleEnabled(true);
  }

  useEffect(() => {
    function handleTrackCompleted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      void recordAchievementPlaybackSignal({
        productId: product.id,
        trackId: detail.trackId,
        sessionId: currentPlaybackSessionId(),
        signalType: 'track_completed',
      });
      setCompletedTrackIds(current => new Set(current).add(detail.trackId));
    }
    function handleTrackStarted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      if (detail.reason === 'manual' || detail.reason === 'next' || detail.reason === 'previous') {
        void recordAchievementPlaybackSignal({
          productId: product.id,
          trackId: detail.trackId,
          sessionId: currentPlaybackSessionId(),
          signalType: 'track_skipped',
        });
        setNoSkipsEligible(false);
      }
    }
    window.addEventListener(MUSIC_TRACK_COMPLETED_EVENT, handleTrackCompleted);
    window.addEventListener(MUSIC_TRACK_STARTED_EVENT, handleTrackStarted);
    return () => {
      window.removeEventListener(MUSIC_TRACK_COMPLETED_EVENT, handleTrackCompleted);
      window.removeEventListener(MUSIC_TRACK_STARTED_EVENT, handleTrackStarted);
    };
  }, [product.id]);

  useEffect(() => {
    async function evaluateCompletedRelease() {
      if (!isMusic) return;
      if (fullReleaseHandled) return;
      const playableTrackIds = tracks.filter(track => Boolean(track.audio_url)).map(track => track.id);
      if (playableTrackIds.length === 0 || !playableTrackIds.every(trackId => completedTrackIds.has(trackId))) return;
      if (!row.item_id) return;
      setFullReleaseHandled(true);
      const triggerTypes = ['all_tracks_listened'];
      if (noSkipsEligible) triggerTypes.push('album_no_skips');
      const now = new Date();
      if (now.getHours() >= 22 || now.getHours() < 4) triggerTypes.push('release_completed_at_night');
      triggerTypes.push('release_completed_three_sessions');
      const unlocked: AchievementToastData[] = [];
      for (const triggerType of triggerTypes) {
        const result = await trackProductAchievementTrigger({
          userId,
          productId: row.item_id,
          triggerType,
          achievements,
          unlockedAchievementIds: localUnlockedAchievementIds,
          metadata: {
            source: 'library_playback',
            playback_session_id: currentPlaybackSessionId(),
            timezone_offset_minutes: now.getTimezoneOffset(),
          },
        });
        unlocked.push(...result.unlockedAchievements);
      }
      const unlockedAchievement = unlocked[unlocked.length - 1];
      if (!unlockedAchievement) return;
      setLocalUnlockedAchievementIds(current => {
        const next = new Set(current);
        unlocked.forEach(achievement => next.add(achievement.id));
        return next;
      });
      setToast(unlockedAchievement);
    }
    evaluateCompletedRelease();
  }, [achievements, completedTrackIds, fullReleaseHandled, isMusic, localUnlockedAchievementIds, noSkipsEligible, row.item_id, tracks, userId]);

  const content = getProductLibraryContent(product);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, track.number ?? index + 1])),
    [tracks],
  );
  const creatorLink = withSourceProduct(creatorHref(product.creators ?? creatorDisplayName), product.id);
  const releaseMeta = [
    (product.item_type || content.detailsTitle).toUpperCase(),
    ...(product.year ? [String(product.year)] : []),
  ];
  const primaryActions: ProductDetailAction[] = [
    {
      label: isMusic ? 'Play' : isBook ? 'Read' : action.label,
      onClick: isMusic ? playRelease : () => runProductAction(action),
    },
    isMusic
      ? { label: 'Shuffle', onClick: shuffleRelease, active: shuffleEnabled }
      : { label: 'View Creator', href: creatorLink, secondary: true },
  ];

  return (
    <div className="view-detail-single library-detail-page">

      <ProductDetailHeader
        product={product}
        creatorName={creatorDisplayName}
        creatorHrefValue={creatorLink}
        meta={releaseMeta}
        actions={primaryActions}
      />

      {/* Tracklist (music) */}
      {isMusic && tracks.length > 0 && (
        <div className="view-section view-tracklist-section">
          <h2 className="view-section-title">Tracklist</h2>
          <div className="view-tracklist">
            {tracks.map((track, index) => (
              <div
                className={selectedTrackId === track.id ? 'view-track-row view-track-row-selected' : 'view-track-row'}
                key={track.id}
                onClick={() => {
                  setSelectedTrackId(track.id);
                  void toggleTrack(track);
                }}
                onContextMenu={event => openContextMenu(event, [
                  { id: 'play', label: 'Play', onSelect: () => { void toggleTrack(track); } },
                  { id: 'play-next', label: 'Play Next', onSelect: () => queueTrackNext(track), disabled: !track.audio_url },
                ])}
                role="button"
                tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedTrackId(track.id);
                    void toggleTrack(track);
                  }
                }}
              >
                <div className={currentTrack?.id === track.id ? 'view-track-leading view-track-leading-current' : 'view-track-leading'}>
                  <span className="view-track-number">{trackNumbers.get(track.id) ?? index + 1}</span>
                  <button
                    type="button"
                    className="view-track-play"
                    aria-label={`${currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      setSelectedTrackId(track.id);
                      void toggleTrack(track);
                    }}
                    disabled={!track.audio_url}
                  >
                    <span className={currentTrack?.id === track.id ? `view-track-icon view-track-icon-equalizer${isPlaying ? ' view-track-icon-equalizer-playing' : ''}` : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                  </button>
                </div>
                <span className={currentTrack?.id === track.id && isPlaying ? 'view-track-title view-track-title-active' : 'view-track-title'}>{track.title}</span>
                <span className="view-track-duration">{formatDuration(getTrackDurationSeconds(track, inferredTrackDurations))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMusic && (
        <div className="view-section">
          <h2 className="view-section-title">{content.contentTitle}</h2>
          <p className="os-type-body view-description">
            {content.emptyCopy}
          </p>
        </div>
      )}

      {isMusic && <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={localUnlockedAchievementIds} />}
      {isMusic && <LibraryBonusContentSection bonusAssets={bonusAssets} unlocked={hasOverachieverUnlocked} />}
      {!isMusic && <LibraryFilesSection assets={assets} />}
      <LibraryProductDetailsSection product={product} tracks={tracks} inferredTrackDurations={inferredTrackDurations} />

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from this creator yet." />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function runProductAction(action: ReturnType<typeof getProductLibraryPrimaryAction>) {
  if (action.href) { window.open(action.href, '_blank', 'noopener,noreferrer'); return; }
  alert(action.missingMessage);
}

function shuffleMusicQueue(queue: MusicQueueTrack[]) {
  const shuffled = [...queue];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTrackDurationSeconds(track: Track, inferredTrackDurations: Record<string, number>) {
  return track.duration_seconds && track.duration_seconds > 0
    ? track.duration_seconds
    : inferredTrackDurations[track.id] ?? null;
}
