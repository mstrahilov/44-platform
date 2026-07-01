'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductCollectionContent, getProductCollectionPrimaryAction, getProductRuntimeKind } from '@/lib/collectionContent';
import { creatorHref, type ProductAchievement, type Resource, type ServiceRequest, type Track, type UserAchievement } from '@/lib/platform';
import { DetailRow, PageShell } from '@/components/Ui';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { unlockAchievementForUser } from '@/lib/achievementNotifications';

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

  if (authLoading || loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (error) return <CenteredMessage>{error}</CenteredMessage>;
  if (!user) return <CenteredMessage>Sign in to view this collection item.</CenteredMessage>;

  if (kind === 'product' && productRow?.products) {
    return <ProductCollectionDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />;
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
  const creatorLink = creatorHref(product.creator);
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const unlocked = achievements.filter(item => localUnlockedAchievementIds.has(item.id));
  const locked = achievements.filter(item => !localUnlockedAchievementIds.has(item.id));
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);

  useEffect(() => {
    setActiveTrackId(null);
    setPlayedTrackIds(new Set());
  }, [product.id]);

  useEffect(() => {
    setLocalUnlockedAchievementIds(unlockedAchievementIds);
  }, [unlockedAchievementIds]);

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
        item => item.trigger_type === 'all_tracks_listened' || item.trigger_type === 'played_all_tracks',
      );
      if (!achievement) return;
      if (localUnlockedAchievementIds.has(achievement.id)) return;

      const unlockedAchievement = await unlockAchievementForUser(
        userId,
        row.product_id,
        achievement,
        { source: 'collection_playback' },
      );

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

  return (
    <PageShell>
      <AchievementToast toast={toast} onDone={() => setToast(null)} />
      <CollectionHeaderPanel
        coverUrl={product.cover_url}
        eyebrow={product.product_type}
        title={product.title}
        subtitle={`by ${product.creator}`}
        actions={(
          <>
            <button className="os-button os-button-primary" type="button" onClick={() => runProductAction(action)}>{action.label}</button>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
          </>
        )}
      />

      <CollectionInfoPanel
        title="Info"
        copy={product.long_description || product.short_description || `${product.title} is ready in your Collection.`}
      />

      {isMusic && (
        <section className="collection-panel">
          <div className="collection-panel-header">
            <div className="surface-eyebrow">Tracklist</div>
            <span>{tracks.length} tracks</span>
          </div>
          <div className="collection-track-list">
            {tracks.map((track, index) => (
              <div className="collection-track-row" key={track.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  aria-label={`${activeTrackId === track.id ? 'Pause' : 'Play'} ${track.title}`}
                  onClick={() => toggleTrack(track)}
                >
                  {activeTrackId === track.id ? '❚❚' : '▶'}
                </button>
                <strong>{track.title}</strong>
                <em>{formatDuration(track.duration_seconds)}</em>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isMusic && (
        <section className="collection-panel">
          <div className="collection-panel-header">
            <div className="surface-eyebrow">{content.contentTitle}</div>
          </div>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
            {content.emptyCopy}
          </p>
        </section>
      )}

      {achievements.length > 0 && (
        <section className="collection-panel">
          <div className="collection-panel-header">
            <div className="surface-eyebrow">Achievements</div>
            <span>{unlocked.length} of {achievements.length}</span>
          </div>
          <AchievementList title="Unlocked" achievements={unlocked} unlocked />
          <AchievementList title="Locked" achievements={locked} />
        </section>
      )}

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Details / Meta</div>
        </div>
        <div className="collection-panel-stack">
          <DetailRow label="Type" value={product.product_type} />
          <DetailRow label="Category" value={product.category} />
          <DetailRow label="Creator" value={product.creator} />
          <DetailRow label="Access" value={content.accessLabel} />
          <DetailRow label="Added" value={new Date(row.acquired_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          {(product.tags ?? []).length > 0 && (
            <div className="app-tag-row" style={{ marginTop: 'var(--os-space-2)' }}>
              {(product.tags ?? []).map(tag => (
                <span key={tag} className="os-pill os-type-pill">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function ResourceCollectionDetail({ row }: { row: { id: string; saved_at: string; resources: Resource | null } }) {
  const resource = row.resources!;
  const creatorName = resource.creators?.name ?? '44 Community';
  const creatorLink = resource.creators?.slug ? `/community/${resource.creators.slug}` : '/community';
  const infoCopy = resource.long_description ?? resource.short_description ?? 'Resource content coming soon.';

  return (
    <PageShell>
      <CollectionHeaderPanel
        coverUrl={resource.cover_url}
        eyebrow={resource.resource_type}
        title={resource.title}
        subtitle={`by ${creatorName}`}
        actions={(
          <>
            <button className="os-button os-button-primary" type="button" onClick={() => openTarget(resource.download_url)}>Download</button>
            <Link className="os-button os-button-secondary" href={creatorLink}>View Creator</Link>
          </>
        )}
      />

      <CollectionInfoPanel title="Info" copy={infoCopy} />

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Content</div>
        </div>
        <div className="collection-rich-copy">
          {resource.long_description ? (
            resource.long_description.split('\n').filter(Boolean).map((paragraph, index) => (
              <p key={`${resource.id}-paragraph-${index}`}>{paragraph}</p>
            ))
          ) : (
            <p>{resource.short_description ?? 'No in-app reader content yet.'}</p>
          )}
        </div>
      </section>

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Details / Meta</div>
        </div>
        <div className="collection-panel-stack">
          <DetailRow label="Type" value={resource.resource_type} />
          <DetailRow label="Category" value={resource.categories?.name ?? 'Resource'} />
          <DetailRow label="Creator" value={creatorName} />
          <DetailRow label="Saved" value={new Date(row.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        </div>
      </section>
    </PageShell>
  );
}

function ServiceCollectionDetail({ row }: { row: ServiceRequest }) {
  const service = row.services!;
  const creatorName = service.creators?.name ?? '44 Creator';
  const creatorLink = service.creators?.slug ? `/community/${service.creators.slug}` : '/community';
  const infoCopy = service.long_description || service.short_description || 'Service details coming soon.';

  return (
    <PageShell>
      <CollectionHeaderPanel
        coverUrl={service.cover_url}
        eyebrow={service.categories?.name ?? 'Service'}
        title={service.title}
        subtitle={creatorName}
        actions={(
          <>
            <Link className="os-button os-button-primary" href={creatorLink}>View Creator</Link>
          </>
        )}
      />

      <CollectionInfoPanel title="Info" copy={infoCopy} />

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Content</div>
        </div>
        <div className="collection-rich-copy">
          <p>{row.message || 'No request note added yet.'}</p>
        </div>
      </section>

      <section className="collection-panel">
        <div className="collection-panel-header">
          <div className="surface-eyebrow">Details / Meta</div>
        </div>
        <div className="collection-panel-stack">
          <DetailRow label="Type" value={service.service_type ?? service.title} />
          <DetailRow label="Category" value={service.categories?.name ?? 'Service'} />
          <DetailRow label="Creator" value={creatorName} />
          <DetailRow label="Status" value={row.status} />
          <DetailRow label="Requested" value={new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        </div>
      </section>
    </PageShell>
  );
}

function CollectionHeaderPanel({
  coverUrl,
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  coverUrl?: string | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="collection-release-hero">
      <div className="collection-release-cover">
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" />
        )}
      </div>
      <div className="collection-release-copy">
        <div className="surface-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="collection-action-buttons">{actions}</div>}
    </section>
  );
}

function CollectionInfoPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="collection-panel">
      <div className="collection-panel-header">
        <div className="surface-eyebrow">{title}</div>
      </div>
      <p className="os-type-body collection-muted-copy">{copy}</p>
    </section>
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
