'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContextMenu } from '@/components/ContextMenu';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { Product } from '@/lib/products';
import { productLibraryHref } from '@/lib/experience';
import { getProductLibraryContent, getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import { creatorHref, type ProductAchievement, type Track, type UserAchievement } from '@/lib/platform';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { LibraryAchievementsSection, LibraryBonusContentSection, LibraryProductDetailsSection, ProductDetailHeader, type LibraryBonusAsset, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import { useTopbarBack } from '@/components/TopbarContext';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';

type LibraryKind = 'product';

interface LibraryItemRow {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

export function LibraryItemDetail({
  kind,
  id,
  backHref = '/music/library',
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
        const { data, error: itemError } = await supabase
          .from('library_items')
          .select('id,product_id,acquisition_type,acquired_at,status,products(*, creators:profiles!author_id(*))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) {
          setError(itemError?.message ?? 'Library item not found.');
          setLoading(false);
          return;
        }

        const row = data as unknown as LibraryItemRow;
        setProductRow(row);

        if (legacyRedirect && row.products) {
          router.replace(productLibraryHref(row.products, row.id));
          return;
        }

        if (row.product_id) {
          const [{ data: trackRows }, { data: achievementRows }, { data: unlockedRows }, { data: assetRows }] = await Promise.all([
            supabase
              .from('tracks')
              .select('id,product_id,number,title,duration_seconds,audio_url,download_url')
              .eq('product_id', row.product_id)
              .order('number'),
            supabase
              .from('product_achievements')
              .select('id,product_id,code,title,description,trigger_type,trigger_config,reward_product_id,reward_config,points,icon,sort_order,is_secret')
              .eq('product_id', row.product_id)
              .order('sort_order'),
            supabase
              .from('user_achievements')
              .select('id,user_id,achievement_id,product_id,unlocked_at')
              .eq('user_id', userId)
              .eq('product_id', row.product_id),
            supabase
              .from('product_assets')
              .select('asset_type,title,file_url')
              .eq('product_id', row.product_id)
              .in('asset_type', ['bonus_content', 'bonus_achievement']),
          ]);

          setTracks((trackRows as Track[] | null) ?? []);
          setAchievements(row.products && getProductRuntimeKind(row.products) === 'music'
            ? ((achievementRows as ProductAchievement[] | null) ?? []).filter(achievement => isV1AchievementCode(achievement.code))
            : []);
          setBonusAssets((assetRows as LibraryBonusAsset[] | null) ?? []);
          setUnlockedAchievementIds(new Set(((unlockedRows as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
        }
      }

      setLoading(false);
    }

    fetchItem(userId);
  }, [authLoading, id, kind, legacyRedirect, router, userId]);

  if (authLoading || loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (error) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{error}</div>;
  if (!user) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Sign in to view this library item.</div>;

  if (kind === 'product' && productRow?.products) {
    return <ProductLibraryDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} bonusAssets={bonusAssets} unlockedAchievementIds={unlockedAchievementIds} />;
  }

  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Library item not found.</div>;
}

function ProductLibraryDetail({
  userId,
  row,
  tracks,
  achievements,
  bonusAssets,
  unlockedAchievementIds,
}: {
  userId: string;
  row: LibraryItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  bonusAssets: LibraryBonusAsset[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const runtimeKind = getProductRuntimeKind(product);
  const isMusic = runtimeKind === 'music';
  const isBook = runtimeKind === 'book';
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack, queueNext } = useMusicPlayer();
  const { openContextMenu } = useContextMenu();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [shuffleEnabled, setShuffleEnabled] = useState(false);

  useEffect(() => { Promise.resolve().then(() => setPlayedTrackIds(new Set())); }, [product.id]);
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
      }))
  ), [product.cover_url, product.creator, product.creators?.display_name, product.hero_url, product.id, product.title, tracks]);
  const overachieverAchievement = achievements.find(achievement => achievement.code === 'overachiever');
  const hasOverachieverUnlocked = Boolean(overachieverAchievement && localUnlockedAchievementIds.has(overachieverAchievement.id));

  async function toggleTrack(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;

    togglePlayerTrack(musicQueue, trackIndex);
    setPlayedTrackIds(current => {
      const next = new Set(current);
      next.add(track.id);
      return next;
    });
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
    setPlayedTrackIds(current => {
      const next = new Set(current);
      next.add(musicQueue[0].id);
      return next;
    });
    setShuffleEnabled(false);
  }

  function shuffleRelease() {
    if (!musicQueue.length) return;
    if (shuffleEnabled) {
      playRelease();
      return;
    }
    const shuffled = shuffleMusicQueue(musicQueue);
    playQueue(shuffled, 0);
    setSelectedTrackId(shuffled[0]?.id ?? null);
    setPlayedTrackIds(current => {
      const next = new Set(current);
      next.add(shuffled[0].id);
      return next;
    });
    setShuffleEnabled(true);
  }

  useEffect(() => {
    async function maybeUnlockCasualListener() {
      if (!isMusic) return;
      if (tracks.length === 0) return;
      const requiredTrackCount = tracks.filter(track => track.title?.trim()).length || tracks.length;
      if (playedTrackIds.size < requiredTrackCount) return;
      if (!row.product_id) return;
      const achievement = achievements.find(
        item =>
          item.trigger_type === 'all_tracks_listened'
          || item.trigger_type === 'played_all_tracks'
          || item.trigger_type === 'tracks_completed'
          || item.trigger_type === 'listen_all_tracks'
          || item.code?.toLowerCase() === 'casual_listener',
      );
      if (!achievement) return;
      if (localUnlockedAchievementIds.has(achievement.id)) return;
      const unlockedAchievement = await unlockAchievementForUser(userId, row.product_id, achievement, { source: 'library_playback' });
      if (!unlockedAchievement) return;
      setLocalUnlockedAchievementIds(current => {
        const next = new Set(current);
        next.add(achievement.id);
        return next;
      });
      setToast(unlockedAchievement);
    }
    maybeUnlockCasualListener();
  }, [achievements, isMusic, localUnlockedAchievementIds, playedTrackIds, row.product_id, tracks, userId]);

  const content = getProductLibraryContent(product);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, track.number ?? index + 1])),
    [tracks],
  );
  const creatorLink = creatorHref(product.creators ?? creatorDisplayName);
  const releaseMeta = [
    (product.product_type || content.detailsTitle).toUpperCase(),
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
