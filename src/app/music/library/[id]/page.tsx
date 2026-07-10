'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useContextMenu } from '@/components/ContextMenu';
import { LibraryAchievementsSection, LibraryBonusContentSection, LibraryCreatorChip, LibraryProductDetailsSection, type LibraryBonusAsset } from '@/components/LibraryDetailPrimitives';
import {
  MUSIC_TRACK_COMPLETED_EVENT,
  MUSIC_TRACK_STARTED_EVENT,
  useMusicPlayer,
  type MusicQueueTrack,
  type MusicTrackPlaybackEventDetail,
} from '@/components/MusicPlayer';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { useTopbarBack } from '@/components/TopbarContext';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import { incrementAchievementProgress, trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { creatorHref, type ProductAchievement, type Track, type UserAchievement } from '@/lib/platform';
import Link from 'next/link';

interface MusicLibraryRow {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

export default function MusicLibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  useTopbarBack({ href: '/library/music', label: 'Music Library' });
  const [row, setRow] = useState<MusicLibraryRow | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [bonusAssets, setBonusAssets] = useState<LibraryBonusAsset[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;

    async function fetchRelease(userId: string) {
      setLoading(true);
      setError(null);

      const { data, error: itemError } = await supabase
        .from('library_items')
        .select('id,product_id,acquisition_type,acquired_at,status,products(*, creators:profiles!author_id(*))')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (itemError || !data) {
        setError(itemError?.message ?? 'Release not found.');
        setLoading(false);
        return;
      }

      const libraryRow = data as unknown as MusicLibraryRow;
      if (!libraryRow.products || getProductRuntimeKind(libraryRow.products) !== 'music') {
        setError('Release not found.');
        setLoading(false);
        return;
      }

      setRow(libraryRow);

      const [{ data: trackRows }, { data: achievementRows }, { data: unlockedRows }, { data: assetRows }] = await Promise.all([
        supabase.from('tracks').select('*').eq('product_id', libraryRow.product_id),
        supabase
          .from('product_achievements')
          .select('id,product_id,code,title,description,trigger_type,trigger_config,reward_product_id,reward_config,points,icon,sort_order,is_secret')
          .eq('product_id', libraryRow.product_id)
          .order('sort_order'),
        supabase
          .from('user_achievements')
          .select('id,user_id,achievement_id,product_id,unlocked_at')
          .eq('user_id', userId)
          .eq('product_id', libraryRow.product_id),
        supabase
          .from('product_assets')
          .select('asset_type,title,file_url')
          .eq('product_id', libraryRow.product_id)
          .in('asset_type', ['bonus_content', 'bonus_achievement']),
      ]);

      const orderedTracks = ((trackRows as Track[] | null) ?? []).sort((a, b) => trackOrder(a) - trackOrder(b));
      setTracks(orderedTracks);
      setAchievements(((achievementRows as ProductAchievement[] | null) ?? []).filter(achievement => isV1AchievementCode(achievement.code)));
      setBonusAssets((assetRows as LibraryBonusAsset[] | null) ?? []);
      setUnlockedAchievementIds(new Set(((unlockedRows as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
      setLoading(false);
    }

    fetchRelease(userId);
  }, [authLoading, id, userId]);

  if (authLoading) return <ReleaseStateMessage>Loading...</ReleaseStateMessage>;
  if (!user) return <ReleaseStateMessage>Sign in to view this release.</ReleaseStateMessage>;
  if (loading) return <ReleaseStateMessage>Loading...</ReleaseStateMessage>;
  if (error) return <ReleaseStateMessage>{error}</ReleaseStateMessage>;
  if (!row?.products) return <ReleaseStateMessage>Release not found.</ReleaseStateMessage>;

  return (
    <OwnedMusicRelease
      key={row.id}
      userId={user.id}
      row={row}
      tracks={tracks}
      achievements={achievements}
      bonusAssets={bonusAssets}
      unlockedAchievementIds={unlockedAchievementIds}
    />
  );
}

function OwnedMusicRelease({
  userId,
  row,
  tracks,
  achievements,
  bonusAssets,
  unlockedAchievementIds,
}: {
  userId: string;
  row: MusicLibraryRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  bonusAssets: LibraryBonusAsset[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack, queueNext } = useMusicPlayer();
  const { openContextMenu } = useContextMenu();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(() => new Set(unlockedAchievementIds));
  const [completedTrackIds, setCompletedTrackIds] = useState<Set<string>>(new Set());
  const [noSkipsEligible, setNoSkipsEligible] = useState(false);
  const [fullReleaseHandled, setFullReleaseHandled] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const downloadsUnlocked = row.acquisition_type === 'purchase';

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
      }))
  ), [product.cover_url, product.creator, product.creators?.display_name, product.hero_url, product.id, product.title, tracks]);
  const overachieverAchievement = achievements.find(achievement => achievement.code === 'overachiever');
  const hasOverachieverUnlocked = Boolean(overachieverAchievement && localUnlockedAchievementIds.has(overachieverAchievement.id));

  async function toggleTrack(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;

    if (currentTrack?.productId === product.id && currentTrack.id !== track.id) {
      setNoSkipsEligible(false);
    }
    if (trackIndex === 0 && currentTrack?.productId !== product.id) {
      setCompletedTrackIds(new Set());
      setNoSkipsEligible(true);
      setFullReleaseHandled(false);
    }
    setSelectedTrackId(track.id);
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

    playQueue(musicQueue, 0);
    setSelectedTrackId(musicQueue[0]?.id ?? null);
    setCompletedTrackIds(new Set());
    setNoSkipsEligible(true);
    setFullReleaseHandled(false);
  }

  useEffect(() => {
    function handleTrackCompleted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      setCompletedTrackIds(current => {
        const next = new Set(current);
        next.add(detail.trackId);
        return next;
      });
    }

    function handleTrackStarted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      if (detail.reason === 'manual' || detail.reason === 'next' || detail.reason === 'previous') {
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

  const playableTrackIds = useMemo(() => tracks.filter(track => Boolean(track.audio_url)).map(track => track.id), [tracks]);

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

  async function unlockTrigger(triggerType: string, metadata?: Record<string, unknown>) {
    const result = await trackProductAchievementTrigger({
      userId,
      productId: row.product_id,
      triggerType,
      achievements,
      unlockedAchievementIds: localUnlockedAchievementIds,
      metadata,
    });
    if (result.unlockedIds.length === 0) return;
    setLocalUnlockedAchievementIds(current => {
      const next = new Set(current);
      result.unlockedIds.forEach(id => next.add(id));
      return next;
    });
    const lastUnlocked = result.unlockedAchievements[result.unlockedAchievements.length - 1];
    if (lastUnlocked) setToast(lastUnlocked);
  }

  useEffect(() => {
    async function handleFullReleaseListened() {
      if (fullReleaseHandled || playableTrackIds.length === 0) return;
      if (!playableTrackIds.every(trackId => completedTrackIds.has(trackId))) return;
      setFullReleaseHandled(true);
      await unlockTrigger('all_tracks_listened', { source: 'music_library_playback' });

      if (noSkipsEligible) {
        await unlockTrigger('album_no_skips', { source: 'music_library_playback' });
      }

      const hour = new Date().getHours();
      if (hour >= 22 || hour < 4) {
        await unlockTrigger('release_completed_at_night', { source: 'music_library_playback', local_hour: hour });
      }

      if (isWithinLaunchWindow(product.created_at)) {
        await unlockTrigger('release_completed_launch_window', { source: 'music_library_playback' });
      }

      const listenCount = await incrementAchievementProgress({
        userId,
        productId: product.id,
        metric: 'full_release_listens',
        metadata: { last_listened_at: new Date().toISOString() },
      });
      if (listenCount >= 3) {
        await unlockTrigger('release_completed_three_sessions', { source: 'music_library_playback', full_listens: listenCount });
      }
    }

    handleFullReleaseListened();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTrackIds, fullReleaseHandled, noSkipsEligible, playableTrackIds, product.created_at, product.id, userId]);

  const heroImage = product.hero_url || product.cover_url;
  const releaseType = product.product_type || 'Release';
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const creatorLink = creatorHref(product.creators ?? creatorDisplayName);
  const description = product.long_description || product.short_description || '';

  return (
    <div className="view-detail-single library-detail-page">
      <div
        className={heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow view-product-meta-line">
            <span>{releaseType.toUpperCase()}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            {downloadsUnlocked && (<><span className="view-album-meta-sep" /><span className="view-album-meta-strong view-album-meta-accent">OWNED</span></>)}
          </div>
          <h1 className="view-album-title">{product.title}</h1>
          <LibraryCreatorChip creator={product.creators ?? null} fallbackName={creatorDisplayName} sourceProductId={product.id} />
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={playRelease}>{musicQueue.length ? 'Play' : action.label}</button>
            {downloadsUnlocked && product.download_url && (
              <a className="os-button os-button-secondary" href={product.download_url} target="_blank" rel="noreferrer">Download</a>
            )}
            <Link className="os-button os-button-ghost" href={creatorLink}>View Creator</Link>
          </div>
        </div>
      </div>

      {description.length > 0 && (
        <div className="view-section">
          <h2 className="view-section-title">Description</h2>
          <p className="os-type-body view-description">{description}</p>
        </div>
      )}

      <div className="view-section">
        <h2 className="view-section-title">Tracklist</h2>

        {tracks.length > 0 ? (
          <div className="view-tracklist">
            {tracks.map((track, index) => (
              <div
                className={selectedTrackId === track.id ? 'view-track-row view-track-row-selected' : 'view-track-row'}
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
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
                  }
                }}
              >
                <div className="view-track-leading">
                  <span className="view-track-number">{String(index + 1).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="view-track-play"
                    aria-label={`${currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      toggleTrack(track);
                    }}
                    disabled={!track.audio_url}
                  >
                    <span className={currentTrack?.id === track.id && isPlaying ? 'view-track-icon view-track-icon-pause' : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                  </button>
                </div>
                <span className={currentTrack?.id === track.id && isPlaying ? 'view-track-title view-track-title-active' : 'view-track-title'}>{track.title}</span>
                <span className="view-track-duration">{formatDuration(getTrackDurationSeconds(track, inferredTrackDurations))}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="os-type-body view-description">Tracklist coming soon.</p>
        )}
      </div>

      <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={localUnlockedAchievementIds} />
      <LibraryBonusContentSection bonusAssets={bonusAssets} unlocked={hasOverachieverUnlocked} />
      <LibraryProductDetailsSection product={product} tracks={tracks} inferredTrackDurations={inferredTrackDurations} />

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from this creator yet." />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function ReleaseStateMessage({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{children}</div>;
}

function trackOrder(track: Track) {
  return track.number ?? 999;
}

function runProductAction(action: ReturnType<typeof getProductLibraryPrimaryAction>) {
  if (action.href) {
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }

  alert(action.missingMessage);
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

function isWithinLaunchWindow(createdAt: string | null | undefined) {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return false;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= fourteenDaysMs;
}
