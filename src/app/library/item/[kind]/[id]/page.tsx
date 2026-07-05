'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { productLibraryHref } from '@/lib/experience';
import { getProductLibraryContent, getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import { creatorHref, type ProductAchievement, type Resource, type ServiceRequest, type Track, type UserAchievement } from '@/lib/platform';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { LibraryAchievementsSection, LibraryCreatorChip } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import { useTopbarBack } from '@/components/TopbarContext';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';

type LibraryKind = 'product' | 'resource' | 'service';

interface LibraryItemRow {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

export default function LibraryItemPage() {
  const { kind, id } = useParams<{ kind: LibraryKind; id: string }>();
  return <LibraryItemDetail kind={kind} id={id} legacyRedirect />;
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
  const router = useRouter();
  useTopbarBack({ href: backHref, label: backLabel });
  const [productRow, setProductRow] = useState<LibraryItemRow | null>(null);
  const [resourceRow, setResourceRow] = useState<{ id: string; saved_at: string; resources: Resource | null } | null>(null);
  const [serviceRow, setServiceRow] = useState<ServiceRequest | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
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
          const [{ data: trackRows }, { data: achievementRows }, { data: unlockedRows }] = await Promise.all([
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
          ]);

          setTracks((trackRows as Track[] | null) ?? []);
          setAchievements((achievementRows as ProductAchievement[] | null) ?? []);
          setUnlockedAchievementIds(new Set(((unlockedRows as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
        }
      }

      if (kind === 'resource') {
        const { data, error: itemError } = await supabase
          .from('saved_resources')
          .select('id,saved_at,resources(*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) setError(itemError?.message ?? 'Saved resource not found.');
        setResourceRow((data as { id: string; saved_at: string; resources: Resource | null } | null) ?? null);
      }

      if (kind === 'service') {
        const { data, error: itemError } = await supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) setError(itemError?.message ?? 'Service request not found.');
        setServiceRow((data as ServiceRequest | null) ?? null);
      }

      setLoading(false);
    }

    fetchItem(user.id);
  }, [authLoading, id, kind, legacyRedirect, router, user]);

  if (authLoading || loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (error) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{error}</div>;
  if (!user) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Sign in to view this library item.</div>;

  if (kind === 'product' && productRow?.products) {
    return <ProductLibraryDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />;
  }

  if (kind === 'resource' && resourceRow?.resources) {
    return <ResourceLibraryDetail row={resourceRow} />;
  }

  if (kind === 'service' && serviceRow?.services) {
    return <ServiceLibraryDetail row={serviceRow} />;
  }

  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Library item not found.</div>;
}

function ProductLibraryDetail({
  userId,
  row,
  tracks,
  achievements,
  unlockedAchievementIds,
}: {
  userId: string;
  row: LibraryItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const isMusic = getProductRuntimeKind(product) === 'music';
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack } = useMusicPlayer();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  useEffect(() => { Promise.resolve().then(() => setPlayedTrackIds(new Set())); }, [product.id]);
  useEffect(() => { Promise.resolve().then(() => setLocalUnlockedAchievementIds(unlockedAchievementIds)); }, [unlockedAchievementIds]);

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

  const heroImage = product.hero_url || product.cover_url;
  const description = product.long_description || product.short_description || '';
  const content = getProductLibraryContent(product);
  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, track.number ?? index + 1])),
    [tracks],
  );

  return (
    <div className="view-detail-single library-detail-page">

      {/* Album header */}
      <div
        className={heroImage ? 'view-album-header library-detail-header' : 'view-album-header view-album-header-fallback library-detail-header'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as React.CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <h1 className="view-album-title">{product.title}</h1>
          <div className="library-release-meta-row">
            <LibraryCreatorChip creator={product.creators ?? null} fallbackName={product.creator} sourceProductId={product.id} />
            <div className="view-album-meta">
              <span>{product.product_type || content.detailsTitle}</span>
              {product.year && (
                <>
                  <span className="view-album-meta-sep" />
                  <span>{product.year}</span>
                </>
              )}
            </div>
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={isMusic ? playRelease : () => runProductAction(action)}>{action.label}</button>
          </div>
        </div>
      </div>

      {/* Description */}
      {description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body view-description">
            {description}
          </p>
        </div>
      )}

      {/* Tracklist (music) */}
      {isMusic && tracks.length > 0 && (
        <div className="view-section">
          <h2 className="view-section-title">Tracklist</h2>
          <div className="view-tracklist">
            {tracks.map((track, index) => (
              <div
                className={selectedTrackId === track.id ? 'view-track-row view-track-row-selected' : 'view-track-row'}
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
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
                  <span className="view-track-number">{String(trackNumbers.get(track.id) ?? index + 1).padStart(2, '0')}</span>
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
                    <span className={currentTrack?.id === track.id && isPlaying ? 'view-track-icon view-track-icon-pause' : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                  </button>
                </div>
                <span className={currentTrack?.id === track.id && isPlaying ? 'view-track-title view-track-title-active' : 'view-track-title'}>{track.title}</span>
                <span className="view-track-duration">{formatDuration(track.duration_seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMusic && description.length <= 40 && (
        <div className="view-section">
          <h2 className="view-section-title">{content.contentTitle}</h2>
          <p className="os-type-body view-description">
            {content.emptyCopy}
          </p>
        </div>
      )}

      {isMusic && <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={localUnlockedAchievementIds} />}

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from the creator yet." />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function ResourceLibraryDetail({ row }: { row: { id: string; saved_at: string; resources: Resource | null } }) {
  const resource = row.resources!;
  const creatorName = resource.creators?.name ?? '44 Community';
  const creatorLink = resource.creators?.slug ? `/community/${resource.creators.slug}` : '/community';
  const infoCopy = resource.long_description ?? resource.short_description ?? 'Resource content coming soon.';

  return (
    <div className="view-detail-single">
      <div className="view-hero">
        {resource.cover_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resource.cover_url} alt={resource.title} />
            <div className="view-hero-overlay">
              <div className="os-type-eyebrow" style={{ opacity: 0.72, marginBottom: 10 }}>{resource.resource_type}</div>
              <h1 className="os-type-display">{resource.title}</h1>
            </div>
          </>
        ) : (
          <>
            <div className="view-hero-gradient" />
            <div className="view-hero-overlay" style={{ background: 'none' }}>
              <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 10 }}>{resource.resource_type}</div>
              <h1 className="os-type-display">{resource.title}</h1>
            </div>
          </>
        )}
      </div>

      <div className="view-section">
        <div className="view-action-bar">
          <div>
            <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 4 }}>{resource.categories?.name ?? 'Resource'}</div>
            <div className="os-type-panel-title">by {creatorName}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
            <button className="os-button os-button-primary" type="button" onClick={() => openTarget(resource.download_url)}>Download</button>
          </div>
        </div>
      </div>

      <div className="view-section">
        <h2 className="view-section-title">About</h2>
        <p className="os-type-body view-description">{infoCopy}</p>
      </div>

      {resource.long_description && (
        <div className="view-section">
          <h2 className="view-section-title">Content</h2>
          <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
            {resource.long_description.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i} className="os-type-body view-description-line">{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceLibraryDetail({ row }: { row: ServiceRequest }) {
  const service = row.services!;
  const creatorName = service.creators?.name ?? '44 Creator';
  const creatorLink = service.creators?.slug ? `/community/${service.creators.slug}` : '/community';
  const infoCopy = service.long_description || service.short_description || 'Service details coming soon.';

  return (
    <div className="view-detail-single">
      <div className="view-hero">
        {service.cover_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={service.cover_url} alt={service.title} />
            <div className="view-hero-overlay">
              <div className="os-type-eyebrow" style={{ opacity: 0.72, marginBottom: 10 }}>{service.categories?.name ?? 'Service'}</div>
              <h1 className="os-type-display">{service.title}</h1>
            </div>
          </>
        ) : (
          <>
            <div className="view-hero-gradient" />
            <div className="view-hero-overlay" style={{ background: 'none' }}>
              <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 10 }}>{service.categories?.name ?? 'Service'}</div>
              <h1 className="os-type-display">{service.title}</h1>
            </div>
          </>
        )}
      </div>

      <div className="view-section">
        <div className="view-action-bar">
          <div>
            <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 4 }}>{service.categories?.name ?? 'Service'}</div>
            <div className="os-type-panel-title">{creatorName}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="os-button os-button-primary" href={creatorLink}>View Creator</Link>
          </div>
        </div>
      </div>

      <div className="view-section">
        <h2 className="view-section-title">About</h2>
        <p className="os-type-body view-description">{infoCopy}</p>
      </div>

      <div className="view-section">
        <h2 className="view-section-title">Your Note</h2>
        <p className="os-type-body view-description">
          {row.message || 'No request note added yet.'}
        </p>
      </div>
    </div>
  );
}

function runProductAction(action: ReturnType<typeof getProductLibraryPrimaryAction>) {
  if (action.href) { window.open(action.href, '_blank', 'noopener,noreferrer'); return; }
  alert(action.missingMessage);
}

function openTarget(url?: string | null) {
  if (url) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
  alert('Download file coming soon.');
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
