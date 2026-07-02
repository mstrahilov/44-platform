'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { getProductCollectionContent, getProductCollectionPrimaryAction, getProductRuntimeKind } from '@/lib/collectionContent';
import { creatorHref, type ProductAchievement, type Resource, type ServiceRequest, type Track, type UserAchievement } from '@/lib/platform';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import { useTopbarBack } from '@/components/TopbarContext';

type CollectionKind = 'product' | 'resource' | 'service';

interface CollectionItemRow {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

export default function CollectionItemPage() {
  const { kind, id } = useParams<{ kind: CollectionKind; id: string }>();
  const { user, loading: authLoading } = useAuth();
  useTopbarBack({ href: '/collection', label: 'Collection' });
  const [productRow, setProductRow] = useState<CollectionItemRow | null>(null);
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
        setError('Sign in to view this collection item.');
      });
      return;
    }

    async function fetchItem(userId: string) {
      setLoading(true);
      setError(null);

      if (kind === 'product') {
        const { data, error: itemError } = await supabase
          .from('collection_items')
          .select('id,product_id,acquisition_type,acquired_at,status,products(*, creators:profiles!author_id(id, slug, username, display_name, avatar_url))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) {
          setError(itemError?.message ?? 'Collection item not found.');
          setLoading(false);
          return;
        }

        const row = data as unknown as CollectionItemRow;
        setProductRow(row);

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
          .select('id,saved_at,resources(*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) setError(itemError?.message ?? 'Saved resource not found.');
        setResourceRow((data as { id: string; saved_at: string; resources: Resource | null } | null) ?? null);
      }

      if (kind === 'service') {
        const { data, error: itemError } = await supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) setError(itemError?.message ?? 'Service request not found.');
        setServiceRow((data as ServiceRequest | null) ?? null);
      }

      setLoading(false);
    }

    fetchItem(user.id);
  }, [authLoading, id, kind, user]);

  if (authLoading || loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (error) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{error}</div>;
  if (!user) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Sign in to view this collection item.</div>;

  if (kind === 'product' && productRow?.products) {
    return <ProductCollectionDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />;
  }

  if (kind === 'resource' && resourceRow?.resources) {
    return <ResourceCollectionDetail row={resourceRow} />;
  }

  if (kind === 'service' && serviceRow?.services) {
    return <ServiceCollectionDetail row={serviceRow} />;
  }

  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Collection item not found.</div>;
}

function ProductCollectionDetail({
  userId,
  row,
  tracks,
  achievements,
  unlockedAchievementIds,
}: {
  userId: string;
  row: CollectionItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductCollectionPrimaryAction(product);
  const content = getProductCollectionContent(product);
  const isMusic = getProductRuntimeKind(product) === 'music';
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const unlocked = achievements.filter(item => localUnlockedAchievementIds.has(item.id));
  const locked = achievements.filter(item => !localUnlockedAchievementIds.has(item.id));
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);

  useEffect(() => { setActiveTrackId(null); setPlayedTrackIds(new Set()); }, [product.id]);
  useEffect(() => { setLocalUnlockedAchievementIds(unlockedAchievementIds); }, [unlockedAchievementIds]);

  async function toggleTrack(track: Track) {
    setActiveTrackId(current => {
      if (!track.audio_url) return track.id;
      const next = current === track.id ? null : track.id;
      return next;
    });
    setPlayedTrackIds(current => {
      const next = new Set(current);
      next.add(track.id);
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
      const unlockedAchievement = await unlockAchievementForUser(userId, row.product_id, achievement, { source: 'collection_playback' });
      if (!unlockedAchievement) return;
      setLocalUnlockedAchievementIds(current => {
        const next = new Set(current);
        next.add(achievement.id);
        return next;
      });
      setToast(unlockedAchievement);
    }
    maybeUnlockCasualListener();
  }, [achievements, isMusic, localUnlockedAchievementIds, playedTrackIds, row.product_id, tracks.length, userId]);

  const heroImage = product.hero_url || product.cover_url;
  const description = product.long_description || product.short_description || '';

  return (
    <div className="view-detail-single">

      {/* Album header */}
      <div
        className={heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as React.CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow">{product.product_type}</div>
          <h1 className="view-album-title">{product.title}</h1>
          <div className="view-album-meta">
            <span style={{ fontWeight: 700 }}>{product.creators?.display_name || product.creator}</span>
            {isMusic && tracks.length > 0 && (
              <>
                <span className="view-album-meta-sep" />
                <span>{tracks.length} track{tracks.length === 1 ? '' : 's'}</span>
              </>
            )}
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={() => runProductAction(action)}>{action.label}</button>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
          </div>
        </div>
      </div>

      {/* Description */}
      {description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720, fontSize: 16 }}>
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
              <div className="view-track-row" key={track.id}>
                <span className="view-track-number">{String(index + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="view-track-play"
                  aria-label={`${activeTrackId === track.id ? 'Pause' : 'Play'} ${track.title}`}
                  onClick={() => toggleTrack(track)}
                >
                  {activeTrackId === track.id ? '❚❚' : '▶'}
                </button>
                <span className="view-track-title">{track.title}</span>
                <span className="view-track-duration">{formatDuration(track.duration_seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-music content placeholder */}
      {!isMusic && (
        <div className="view-section">
          <h2 className="view-section-title">{content.contentTitle}</h2>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720 }}>
            {content.emptyCopy}
          </p>
        </div>
      )}

      {/* Achievements — flat, no cards */}
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
              {unlocked.map(a => (
                <div key={a.id} className="view-achievement-row view-achievement-row-unlocked">
                  <div>
                    <div className="os-type-card-title" style={{ marginBottom: 3 }}>{a.title}</div>
                    <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{a.description}</div>
                  </div>
                  <span className="os-pill os-status-owned">Unlocked</span>
                </div>
              ))}
            </div>
          )}

          {locked.length > 0 && (
            <div className="view-achievement-group" style={{ marginTop: unlocked.length > 0 ? 28 : 0 }}>
              <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 14 }}>Locked</div>
              {locked.map(a => (
                <div key={a.id} className="view-achievement-row">
                  <div>
                    <div className="os-type-card-title" style={{ marginBottom: 3 }}>{a.title}</div>
                    <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{a.description}</div>
                  </div>
                  <span className="os-pill os-status-locked">Locked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function ResourceCollectionDetail({ row }: { row: { id: string; saved_at: string; resources: Resource | null } }) {
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
              <h1 className="os-type-display" style={{ color: '#fff' }}>{resource.title}</h1>
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
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720 }}>{infoCopy}</p>
      </div>

      {resource.long_description && (
        <div className="view-section">
          <h2 className="view-section-title">Content</h2>
          <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
            {resource.long_description.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i} className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72 }}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCollectionDetail({ row }: { row: ServiceRequest }) {
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
              <h1 className="os-type-display" style={{ color: '#fff' }}>{service.title}</h1>
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
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720 }}>{infoCopy}</p>
      </div>

      <div className="view-section">
        <h2 className="view-section-title">Your Note</h2>
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720 }}>
          {row.message || 'No request note added yet.'}
        </p>
      </div>
    </div>
  );
}

function runProductAction(action: ReturnType<typeof getProductCollectionPrimaryAction>) {
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
