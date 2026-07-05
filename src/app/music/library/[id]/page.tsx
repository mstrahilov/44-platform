'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { useTopbarBack } from '@/components/TopbarContext';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import { productStoreHref } from '@/lib/experience';
import { getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { creatorHref, type ProductAchievement, type Track, type UserAchievement } from '@/lib/platform';

interface MusicLibraryRow {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

type MusicTrack = Track & {
  track_number?: number | null;
};

export default function MusicLibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  useTopbarBack({ href: '/library/music', label: 'Music Library' });
  const [row, setRow] = useState<MusicLibraryRow | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setError('Sign in to view this release.');
      return;
    }

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

      const [{ data: trackRows }, { data: achievementRows }, { data: unlockedRows }] = await Promise.all([
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
      ]);

      const orderedTracks = ((trackRows as MusicTrack[] | null) ?? []).sort((a, b) => trackOrder(a) - trackOrder(b));
      setTracks(orderedTracks);
      setAchievements((achievementRows as ProductAchievement[] | null) ?? []);
      setUnlockedAchievementIds(new Set(((unlockedRows as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
      setLoading(false);
    }

    fetchRelease(user.id);
  }, [authLoading, id, user]);

  if (authLoading || loading) return <ReleaseStateMessage>Loading...</ReleaseStateMessage>;
  if (error) return <ReleaseStateMessage>{error}</ReleaseStateMessage>;
  if (!user) return <ReleaseStateMessage>Sign in to view this release.</ReleaseStateMessage>;
  if (!row?.products) return <ReleaseStateMessage>Release not found.</ReleaseStateMessage>;

  return (
    <OwnedMusicRelease
      userId={user.id}
      row={row}
      tracks={tracks}
      achievements={achievements}
      unlockedAchievementIds={unlockedAchievementIds}
    />
  );
}

function OwnedMusicRelease({
  userId,
  row,
  tracks,
  achievements,
  unlockedAchievementIds,
}: {
  userId: string;
  row: MusicLibraryRow;
  tracks: MusicTrack[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const storeHref = productStoreHref(product);
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack } = useMusicPlayer();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const unlocked = achievements.filter(item => localUnlockedAchievementIds.has(item.id));
  const locked = achievements.filter(item => !localUnlockedAchievementIds.has(item.id));
  const downloadsUnlocked = row.acquisition_type === 'purchase';

  useEffect(() => { setPlayedTrackIds(new Set()); }, [product.id]);
  useEffect(() => { setLocalUnlockedAchievementIds(unlockedAchievementIds); }, [unlockedAchievementIds]);

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

  async function toggleTrack(track: MusicTrack) {
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

  function playRelease() {
    if (!musicQueue.length) {
      runProductAction(action);
      return;
    }

    playQueue(musicQueue, 0);
    setPlayedTrackIds(current => {
      const next = new Set(current);
      next.add(musicQueue[0].id);
      return next;
    });
  }

  useEffect(() => {
    async function maybeUnlockCasualListener() {
      if (tracks.length === 0) return;
      const requiredTrackCount = tracks.filter(track => track.title?.trim()).length || tracks.length;
      if (playedTrackIds.size < requiredTrackCount) return;
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
      const unlockedAchievement = await unlockAchievementForUser(userId, row.product_id, achievement, { source: 'music_library_playback' });
      if (!unlockedAchievement) return;
      setLocalUnlockedAchievementIds(current => {
        const next = new Set(current);
        next.add(achievement.id);
        return next;
      });
      setToast(unlockedAchievement);
    }

    maybeUnlockCasualListener();
  }, [achievements, localUnlockedAchievementIds, playedTrackIds, row.product_id, tracks, userId]);

  const heroImage = product.hero_url || product.cover_url;
  const description = product.long_description || product.short_description || '';

  return (
    <div className="view-detail-single">
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
          <div className="view-album-eyebrow">Owned Release</div>
          <h1 className="view-album-title">{product.title}</h1>
          <div className="view-album-meta">
            <span className="view-album-meta-strong">{product.creators?.display_name || product.creator}</span>
            <span className="view-album-meta-sep" />
            <span>{tracks.length} track{tracks.length === 1 ? '' : 's'}</span>
            {product.year && (
              <>
                <span className="view-album-meta-sep" />
                <span>{product.year}</span>
              </>
            )}
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={playRelease}>{musicQueue.length ? 'Play Release' : action.label}</button>
            {downloadsUnlocked && product.download_url && (
              <a className="os-button os-button-secondary" href={product.download_url} target="_blank" rel="noreferrer">Download</a>
            )}
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
            <Link className="os-button os-button-secondary" href={storeHref}>Store Page</Link>
          </div>
        </div>
      </div>

      {description.length > 0 && (
        <div className="view-section">
          <p className="os-type-body view-description">{description}</p>
        </div>
      )}

      <div className="view-section">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <h2 className="view-section-title" style={{ margin: 0 }}>Tracklist</h2>
          {musicQueue.length > 0 && (
            <button className="os-button os-button-secondary" type="button" onClick={playRelease}>Play All</button>
          )}
        </div>

        {tracks.length > 0 ? (
          <div className="view-tracklist">
            {tracks.map((track, index) => (
              <div className="view-track-row" key={track.id}>
                <span className="view-track-number">{String(index + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="view-track-play"
                  aria-label={`${currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                  onClick={() => toggleTrack(track)}
                  disabled={!track.audio_url}
                >
                  {currentTrack?.id === track.id && isPlaying ? 'II' : '>'}
                </button>
                <span className="view-track-title">{track.title}</span>
                {downloadsUnlocked && track.download_url && (
                  <a className="os-button os-button-secondary os-button-compact" href={track.download_url} target="_blank" rel="noreferrer">Download</a>
                )}
                <span className="view-track-duration">{formatDuration(track.duration_seconds)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="os-type-body view-description">Tracklist coming soon.</p>
        )}
      </div>

      {achievements.length > 0 && (
        <div className="view-section">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 className="view-section-title" style={{ margin: 0 }}>Achievements</h2>
            <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
              {unlocked.length} of {achievements.length}
            </span>
          </div>

          {unlocked.length > 0 && (
            <div className="view-achievement-group">
              <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 14 }}>Unlocked</div>
              {unlocked.map(achievement => (
                <div key={achievement.id} className="view-achievement-row view-achievement-row-unlocked">
                  <div>
                    <div className="os-type-card-title" style={{ marginBottom: 3 }}>{achievement.title}</div>
                    <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{achievement.description}</div>
                  </div>
                  <span className="os-pill os-status-owned">Unlocked</span>
                </div>
              ))}
            </div>
          )}

          {locked.length > 0 && (
            <div className="view-achievement-group" style={{ marginTop: unlocked.length > 0 ? 28 : 0 }}>
              <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 14 }}>Locked</div>
              {locked.map(achievement => (
                <div key={achievement.id} className="view-achievement-row">
                  <div>
                    <div className="os-type-card-title" style={{ marginBottom: 3 }}>{achievement.title}</div>
                    <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{achievement.description}</div>
                  </div>
                  <span className="os-pill os-status-locked">Locked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="view-section">
        <h2 className="view-section-title">Release Details</h2>
        <div className="view-info-grid">
          <div>
            <div className="os-type-eyebrow">Access</div>
            <div className="os-type-body">Owned release</div>
          </div>
          <div>
            <div className="os-type-eyebrow">Acquired</div>
            <div className="os-type-body">{formatDate(row.acquired_at)}</div>
          </div>
          <div>
            <div className="os-type-eyebrow">Format</div>
            <div className="os-type-body">{product.product_type}</div>
          </div>
        </div>
      </div>

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from the creator yet." />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function ReleaseStateMessage({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{children}</div>;
}

function trackOrder(track: MusicTrack) {
  return track.track_number ?? track.number ?? 999;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
