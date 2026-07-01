'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductCollectionPrimaryAction, getProductRuntimeKind, isFreeCollectionClaim } from '@/lib/collectionContent';
import type { ProductAchievement, Resource, ServiceRequest, Track, UserAchievement } from '@/lib/platform';
import { DetailLayout, DetailRow, PageShell } from '@/components/Ui';

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
          .select('id,product_id,acquisition_type,acquired_at,status,products(*)')
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
          .select('id,saved_at,resources(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (itemError || !data) setError(itemError?.message ?? 'Saved resource not found.');
        setResourceRow((data as { id: string; saved_at: string; resources: Resource | null } | null) ?? null);
      }

      if (kind === 'service') {
        const { data, error: itemError } = await supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
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

  if (authLoading || loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (error) return <CenteredMessage>{error}</CenteredMessage>;

  if (kind === 'product' && productRow?.products) {
    return <ProductCollectionDetail row={productRow} tracks={tracks} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />;
  }

  if (kind === 'resource' && resourceRow?.resources) {
    return <ResourceCollectionDetail row={resourceRow} />;
  }

  if (kind === 'service' && serviceRow?.services) {
    return <ServiceCollectionDetail row={serviceRow} />;
  }

  return <CenteredMessage>Collection item not found.</CenteredMessage>;
}

function ProductCollectionDetail({
  row,
  tracks,
  achievements,
  unlockedAchievementIds,
}: {
  row: CollectionItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductCollectionPrimaryAction(product);
  const isMusic = getProductRuntimeKind(product) === 'music';
  const canRemove = isFreeCollectionClaim(product);
  const unlocked = achievements.filter(item => unlockedAchievementIds.has(item.id));
  const locked = achievements.filter(item => !unlockedAchievementIds.has(item.id));

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/collection">← Back to Collection</Link>
      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art">
              {product.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.cover_url} alt="" />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{product.category}</div>
              <div className="os-type-section-title">{product.title}</div>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>by {product.creator}</div>
              <div className="app-card-price os-type-card-title" style={{ marginTop: 'var(--os-space-2)' }}>{formatProductPrice(product)}</div>
            </div>
            <div className="app-detail-actions">
              <button className="os-button os-button-primary" type="button" onClick={() => runProductAction(action)}>{action.label}</button>
              <button className="os-button os-button-secondary" type="button" disabled>{canRemove ? 'Remove' : 'Hide'}</button>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Type" value={product.product_type} />
            <DetailRow label="Category" value={product.category} />
            <DetailRow label="Access" value="Collection item" />
            <DetailRow label="Added" value={new Date(row.acquired_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          </>
        }
      >
        <section className="collection-release-hero">
          <div className="collection-release-cover">
            {product.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.cover_url} alt="" />
            )}
          </div>
          <div className="collection-release-copy">
            <div className="surface-eyebrow">{product.product_type}</div>
            <h1>{product.title}</h1>
            <p>by {product.creator}</p>
          </div>
        </section>

        {isMusic && (
          <section className="collection-panel">
            <div className="collection-panel-header">
              <div className="surface-eyebrow">{product.title}</div>
              <span>{tracks.length} tracks</span>
            </div>
            <div className="collection-track-list">
              {tracks.map((track, index) => (
                <div className="collection-track-row" key={track.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <button type="button" aria-label={`Play ${track.title}`}>▶</button>
                  <strong>{track.title}</strong>
                  <em>{formatDuration(track.duration_seconds)}</em>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="collection-panel">
          <div className="collection-panel-header">
            <div className="surface-eyebrow">Achievements</div>
            <span>{unlocked.length} of {achievements.length}</span>
          </div>
          <AchievementList title="Unlocked" achievements={unlocked} unlocked />
          <AchievementList title="Locked" achievements={locked} />
        </section>
      </DetailLayout>
    </PageShell>
  );
}

function ResourceCollectionDetail({ row }: { row: { id: string; saved_at: string; resources: Resource | null } }) {
  const resource = row.resources!;

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/collection">← Back to Collection</Link>
      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art">
              {resource.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resource.cover_url} alt="" />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{resource.categories?.name ?? 'Resource'}</div>
              <div className="os-type-section-title">{resource.title}</div>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>by {resource.creators?.name ?? '44 Community'}</div>
            </div>
            <div className="app-detail-actions">
              <button className="os-button os-button-primary" type="button" onClick={() => openTarget(resource.download_url)}>Download</button>
              <button className="os-button os-button-secondary" type="button" disabled>Remove</button>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Type" value={resource.resource_type} />
            <DetailRow label="Category" value={resource.categories?.name ?? 'Resource'} />
            <DetailRow label="Saved" value={new Date(row.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          </>
        }
      >
        <section className="collection-panel">
          <div className="surface-eyebrow">{resource.resource_type}</div>
          <h1 className="app-detail-title os-type-page-title">{resource.title}</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{resource.body ?? resource.summary ?? 'Resource content coming soon.'}</p>
        </section>
      </DetailLayout>
    </PageShell>
  );
}

function ServiceCollectionDetail({ row }: { row: ServiceRequest }) {
  const service = row.services!;

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/collection">← Back to Collection</Link>
      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art">
              {service.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.cover_url} alt="" />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{service.categories?.name ?? 'Service'}</div>
              <div className="os-type-section-title">{service.title}</div>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>{row.status}</div>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Type" value={service.service_type ?? service.title} />
            <DetailRow label="Status" value={row.status} />
            <DetailRow label="Requested" value={new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          </>
        }
      >
        <section className="collection-panel">
          <div className="surface-eyebrow">Service Request</div>
          <h1 className="app-detail-title os-type-page-title">{service.title}</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{row.message || service.description || 'No request note added.'}</p>
        </section>
      </DetailLayout>
    </PageShell>
  );
}

function AchievementList({ title, achievements, unlocked = false }: { title: string; achievements: ProductAchievement[]; unlocked?: boolean }) {
  if (achievements.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="surface-eyebrow">{title}</div>
      <div className="collection-achievement-grid">
        {achievements.map(achievement => (
          <div key={achievement.id} className={unlocked ? 'collection-achievement-card collection-achievement-card-unlocked' : 'collection-achievement-card'}>
            <div>
              <strong>{achievement.title}</strong>
              <p>{achievement.description}</p>
            </div>
            <span>{unlocked ? 'Unlocked' : 'Locked'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function runProductAction(action: ReturnType<typeof getProductCollectionPrimaryAction>) {
  if (action.href) {
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }

  alert(action.missingMessage);
}

function openTarget(url?: string | null) {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  alert('Download file coming soon.');
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--os-color-ink-muted)', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}
