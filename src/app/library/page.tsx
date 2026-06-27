'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import type { ProductAchievement, Resource, SavedResource, ServiceRequest, Track, UserAchievement } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel, PanelListItem } from '@/components/Ui';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';

interface LibraryItem {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: 'visible' | 'hidden' | 'archived';
  products: Product | null;
}

type LibraryEntry =
  | { key: string; kind: 'product'; title: string; subtitle: string; eyebrow: string; image: string | null; acquiredAt: string; product: Product }
  | { key: string; kind: 'resource'; title: string; subtitle: string; eyebrow: string; image: string | null; savedAt: string; resource: Resource }
  | { key: string; kind: 'service'; title: string; subtitle: string; eyebrow: string; image: string | null; requestedAt: string; request: ServiceRequest };

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tracksByProductId, setTracksByProductId] = useState<Record<string, Track[]>>({});
  const [achievementsByProductId, setAchievementsByProductId] = useState<Record<string, ProductAchievement[]>>({});
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      Promise.resolve().then(() => {
        setLibraryItems([]);
        setSavedResources([]);
        setServiceRequests([]);
        setTracksByProductId({});
        setAchievementsByProductId({});
        setUnlockedAchievementIds(new Set());
        setLoading(false);
        setError(null);
      });
      return;
    }

    async function fetchVault(userId: string) {
      setLoading(true);
      setError(null);

      const [{ data: products, error: productsError }, { data: resources }, { data: requests }] = await Promise.all([
        supabase
          .from('library_items')
          .select('id,product_id,acquisition_type,acquired_at,status,products(*)')
          .eq('user_id', userId)
          .neq('status', 'archived')
          .neq('status', 'hidden')
          .order('acquired_at', { ascending: false }),
        supabase
          .from('saved_resources')
          .select('id,resource_id,saved_at,resources(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false }),
        supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (productsError) {
        setError(`${productsError.message}. Run the clean Supabase reset SQL, then refresh.`);
      }

      setLibraryItems((products as LibraryItem[] | null) ?? []);
      setSavedResources((resources as SavedResource[] | null) ?? []);
      setServiceRequests((requests as ServiceRequest[] | null) ?? []);

      const productIds = ((products as LibraryItem[] | null) ?? [])
        .map(item => item.product_id)
        .filter(Boolean);

      if (productIds.length > 0) {
        const [{ data: tracks }, { data: achievements }, { data: unlocked }] = await Promise.all([
          supabase
            .from('tracks')
            .select('id,product_id,number,title,duration_seconds,audio_url,download_url')
            .in('product_id', productIds)
            .order('number'),
          supabase
            .from('product_achievements')
            .select('id,product_id,code,title,description,trigger_type,trigger_config,reward_product_id,reward_config,points,icon,sort_order,is_secret')
            .in('product_id', productIds)
            .order('sort_order'),
          supabase
            .from('user_achievements')
            .select('id,user_id,achievement_id,product_id,unlocked_at')
            .eq('user_id', userId)
            .in('product_id', productIds),
        ]);

        setTracksByProductId(groupByProductId((tracks as Track[] | null) ?? []));
        setAchievementsByProductId(groupByProductId((achievements as ProductAchievement[] | null) ?? []));
        setUnlockedAchievementIds(new Set(((unlocked as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
      } else {
        setTracksByProductId({});
        setAchievementsByProductId({});
        setUnlockedAchievementIds(new Set());
      }

      setLoading(false);
    }

    fetchVault(user.id);
  }, [authLoading, user]);

  const entries = useMemo<LibraryEntry[]>(() => {
    const productEntries = libraryItems.flatMap(item => {
      if (!item.products) return [];

      return [{
        key: `product-${item.id}`,
        kind: 'product' as const,
        title: item.products.title,
        subtitle: item.products.creator,
        eyebrow: item.products.category,
        image: item.products.cover_url,
        acquiredAt: item.acquired_at,
        product: item.products,
      }];
    });

    const resourceEntries = savedResources.flatMap(item => {
      if (!item.resources) return [];

      return [{
        key: `resource-${item.id}`,
        kind: 'resource' as const,
        title: item.resources.title,
        subtitle: item.resources.creators?.name ?? '44 Community',
        eyebrow: item.resources.categories?.name ?? item.resources.resource_type,
        image: item.resources.cover_url,
        savedAt: item.saved_at,
        resource: item.resources,
      }];
    });

    const serviceEntries = serviceRequests.flatMap(item => {
      if (!item.services) return [];

      return [{
        key: `service-${item.id}`,
        kind: 'service' as const,
        title: item.services.title,
        subtitle: item.services.creators?.name ?? '44 Creator',
        eyebrow: item.status,
        image: item.services.cover_url,
        requestedAt: item.created_at,
        request: item,
      }];
    });

    return [...productEntries, ...resourceEntries, ...serviceEntries];
  }, [libraryItems, savedResources, serviceRequests]);

  const visibleEntries = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return entries;

    return entries.filter(entry => [entry.title, entry.subtitle, entry.eyebrow].join(' ').toLowerCase().includes(cleanQuery));
  }, [entries, query]);

  const selectedEntry = visibleEntries.find(entry => entry.key === selectedKey) ?? visibleEntries[0] ?? entries[0] ?? null;

  useEffect(() => {
    if (!selectedEntry) {
      setSelectedKey(null);
      return;
    }

    if (selectedKey !== selectedEntry.key && !visibleEntries.some(entry => entry.key === selectedKey)) {
      setSelectedKey(selectedEntry.key);
    }
  }, [selectedEntry, selectedKey, visibleEntries]);

  if (authLoading || loading) {
    return <CenteredMessage>Loading...</CenteredMessage>;
  }

  if (!user) {
    return <CenteredMessage>Sign in to view your library</CenteredMessage>;
  }

  if (error) {
    return <CenteredMessage>{error}</CenteredMessage>;
  }

  return (
    <DockedLayout side="left">
      <DockedPanel>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 780, letterSpacing: '-0.035em', color: '#fff', marginBottom: 4 }}>Library</h1>
          <div style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.36)' }}>{entries.length} saved item{entries.length === 1 ? '' : 's'}</div>
        </div>
        <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter your library..." />
        <div className="panel-list">
          {visibleEntries.map(entry => (
            <PanelListItem
              key={entry.key}
              active={selectedEntry?.key === entry.key}
              eyebrow={entry.eyebrow}
              title={entry.title}
              subtitle={entry.subtitle}
              image={entry.image}
              onClick={() => setSelectedKey(entry.key)}
            />
          ))}
        </div>
      </DockedPanel>

      <DockedContent>
        {!selectedEntry ? (
          <EmptyPanel title="Your library is empty" body="Add music products, save resources, or request services to test your personal vault." href="/browse" action="Browse Store" />
        ) : (
          <LibraryDetail
            entry={selectedEntry}
            tracks={selectedEntry.kind === 'product' ? tracksByProductId[selectedEntry.product.id] ?? [] : []}
            achievements={selectedEntry.kind === 'product' ? achievementsByProductId[selectedEntry.product.id] ?? [] : []}
            unlockedAchievementIds={unlockedAchievementIds}
            onLibraryItemStatus={async status => {
              if (selectedEntry.kind !== 'product') return;
              await updateLibraryItemStatus(selectedEntry.key, status, setLibraryItems);
            }}
            onActivity={async activityType => {
              if (!user) return;
              await recordLibraryActivity(user.id, selectedEntry, activityType);
              await recordAchievementEvent(user.id, selectedEntry, activityTypeToEventType(activityType));
            }}
            onTrackComplete={async (track, allTracks) => {
              if (!user || selectedEntry.kind !== 'product') return;
              await recordTrackCompletion(user.id, selectedEntry, track);

              const completedTrackIds = await getCompletedTrackIds(user.id, selectedEntry.product.id);
              const allTracksCompleted = allTracks.length > 0 && allTracks.every(item => completedTrackIds.has(item.id));

              if (allTracksCompleted) {
                const unlocked = await unlockAchievementsForTrigger({
                  userId: user.id,
                  productId: selectedEntry.product.id,
                  triggerType: 'all_tracks_listened',
                  achievements: achievementsByProductId[selectedEntry.product.id] ?? [],
                  unlockedAchievementIds,
                  setUnlockedAchievementIds,
                });
                if (unlocked[0]) setToast(achievementToToast(unlocked[0]));
              }
            }}
            onUnlockAchievement={async triggerType => {
              if (!user || selectedEntry.kind !== 'product') return;
              const unlocked = await unlockAchievementsForTrigger({
                userId: user.id,
                productId: selectedEntry.product.id,
                triggerType,
                achievements: achievementsByProductId[selectedEntry.product.id] ?? [],
                unlockedAchievementIds,
                setUnlockedAchievementIds,
              });
              if (unlocked[0]) setToast(achievementToToast(unlocked[0]));
            }}
          />
        )}
      </DockedContent>
      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </DockedLayout>
  );
}

function LibraryDetail({
  entry,
  tracks,
  achievements,
  unlockedAchievementIds,
  onLibraryItemStatus,
  onActivity,
  onTrackComplete,
  onUnlockAchievement,
}: {
  entry: LibraryEntry;
  tracks: Track[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
  onLibraryItemStatus: (status: 'hidden' | 'archived') => Promise<void>;
  onActivity: (activityType: string) => Promise<void>;
  onTrackComplete: (track: Track, allTracks: Track[]) => Promise<void>;
  onUnlockAchievement: (triggerType: string) => Promise<void>;
}) {
  if (entry.kind === 'resource') {
    return <ResourceDetail entry={entry} onActivity={onActivity} />;
  }

  if (entry.kind === 'service') {
    return <ServiceHistoryDetail entry={entry} />;
  }

  const product = entry.product;
  const isMusic = product.category.toLowerCase() === 'music';

  if (!isMusic) {
    return <ProductLibraryDetail entry={entry} onLibraryItemStatus={onLibraryItemStatus} onActivity={onActivity} onUnlockAchievement={onUnlockAchievement} />;
  }

  return <MusicLibraryDetail entry={entry} tracks={tracks} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} onLibraryItemStatus={onLibraryItemStatus} onActivity={onActivity} onTrackComplete={onTrackComplete} onUnlockAchievement={onUnlockAchievement} />;
}

function MusicLibraryDetail({
  entry,
  tracks,
  achievements,
  unlockedAchievementIds,
  onLibraryItemStatus,
  onActivity,
  onTrackComplete,
  onUnlockAchievement,
}: {
  entry: Extract<LibraryEntry, { kind: 'product' }>;
  tracks: Track[];
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
  onLibraryItemStatus: (status: 'hidden' | 'archived') => Promise<void>;
  onActivity: (activityType: string) => Promise<void>;
  onTrackComplete: (track: Track, allTracks: Track[]) => Promise<void>;
  onUnlockAchievement: (triggerType: string) => Promise<void>;
}) {
  const product = entry.product;
  const playableTracks = tracks.length > 0 ? tracks : FALLBACK_TRACKS;
  const [activeTrackId, setActiveTrackId] = useState<string | null>(playableTracks[0]?.id ?? null);
  const activeTrack = playableTracks.find(track => track.id === activeTrackId) ?? playableTracks[0] ?? null;

  async function playTrack(track: Track) {
    setActiveTrackId(track.id);
    await onActivity('play');
    if (!track.audio_url) {
      await onTrackComplete(track, playableTracks);
    }
  }

  async function downloadAlbum() {
    const target = product.download_url || activeTrack?.download_url;
    await onActivity('download');
    await onUnlockAchievement('downloaded');

    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      alert('Download file coming soon for this release.');
    }
  }

  return (
    <>
      <section className="library-release-hero">
        <div className="library-release-cover">
          {product.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt="" />
          )}
        </div>
        <div className="library-release-copy">
          <div className="surface-eyebrow">{product.product_type}</div>
          <h1>{product.title}</h1>
          <p>by {product.creator}</p>
          <div className="library-chip-row">
            {(product.tags ?? []).slice(0, 4).map(tag => <Link key={tag} href={browseHref({ tag })} className="chip">{tag}</Link>)}
          </div>
        </div>
        <LibraryActionCluster
          primaryLabel="Play"
          onPrimary={() => activeTrack && playTrack(activeTrack)}
          onDownload={downloadAlbum}
          reviewHref={`/product/${product.slug || product.id}#reviews`}
          onHide={() => onLibraryItemStatus('hidden')}
          onArchive={() => onLibraryItemStatus('archived')}
        />
      </section>

      {activeTrack?.audio_url && (
        <section className="library-player-panel">
          <div>
            <div className="surface-eyebrow">Now Playing</div>
            <strong>{activeTrack.title}</strong>
          </div>
          <audio
            controls
            src={activeTrack.audio_url}
            onPlay={() => onActivity('play')}
            onEnded={() => onTrackComplete(activeTrack, playableTracks)}
          />
        </section>
      )}

      <section className="library-stats-grid">
        <InfoCard value={product.year ? String(product.year) : 'Now'} label="Release Year" />
        <InfoCard value={product.product_type} label="Format" />
        <InfoCard value={new Date(entry.acquiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} label="Added" />
      </section>

      <section className="library-panel">
        <div className="library-panel-header">
          <div className="surface-eyebrow">Tracklist</div>
          <span>{playableTracks.length} tracks</span>
        </div>
        <div className="library-track-list">
          {playableTracks.map((track, index) => (
            <div className="library-track-row" key={track.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <button type="button" aria-label={`Play ${track.title}`} onClick={() => playTrack(track)}>▶</button>
              <strong>{track.title}</strong>
              <em>{formatDuration(track.duration_seconds)}</em>
            </div>
          ))}
        </div>
      </section>

      <AchievementPanel achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />

      <section className="library-two-grid">
        <InfoPanel title="Included">
          <InfoLine label="Format" value={product.product_type} />
          <InfoLine label="Category" value={product.category} />
          <InfoLine label="Access" value="Library item" />
        </InfoPanel>
        <InfoPanel title="Discovery">
          <div className="library-chip-row">
            <Link href={browseHref({ category: product.category })} className="chip">{product.category}</Link>
            {(product.tags ?? []).map(tag => <Link key={tag} href={browseHref({ tag })} className="chip">{tag}</Link>)}
          </div>
        </InfoPanel>
      </section>
    </>
  );
}

function ProductLibraryDetail({
  entry,
  onLibraryItemStatus,
  onActivity,
  onUnlockAchievement,
}: {
  entry: Extract<LibraryEntry, { kind: 'product' }>;
  onLibraryItemStatus: (status: 'hidden' | 'archived') => Promise<void>;
  onActivity: (activityType: string) => Promise<void>;
  onUnlockAchievement: (triggerType: string) => Promise<void>;
}) {
  const product = entry.product;
  const action = getProductLibraryAction(product);

  async function runPrimaryAction() {
    await onActivity(action.activityType);
    if (action.activityType === 'download') {
      await onUnlockAchievement('downloaded');
    }

    const target = action.href;
    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      alert(`${action.label} is coming soon for this item.`);
    }
  }

  return (
    <>
      <section className="library-release-hero">
        <div className="library-release-cover">
          {product.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt="" />
          )}
        </div>
        <div className="library-release-copy">
          <div className="surface-eyebrow">{productMeta(product)}</div>
          <h1>{product.title}</h1>
          <p>by {product.creator}</p>
          <div className="library-chip-row">
            {(product.tags ?? []).slice(0, 4).map(tag => <Link key={tag} href={browseHref({ tag })} className="chip">{tag}</Link>)}
          </div>
        </div>
        <LibraryActionCluster
          primaryLabel={action.label}
          onPrimary={runPrimaryAction}
          onDownload={product.download_url ? () => {
            onActivity('download');
            onUnlockAchievement('downloaded');
            window.open(product.download_url!, '_blank', 'noopener,noreferrer');
          } : undefined}
          reviewHref={`/product/${product.slug || product.id}#reviews`}
          onHide={() => onLibraryItemStatus('hidden')}
          onArchive={() => onLibraryItemStatus('archived')}
        />
      </section>

      <section className="library-two-grid">
        <InfoPanel title="Product">
          <InfoLine label="Price" value={formatProductPrice(product)} />
          <InfoLine label="Category" value={product.category} />
          <InfoLine label="Added" value={new Date(entry.acquiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        </InfoPanel>
        <InfoPanel title="About">
          <div className="library-muted-copy">{product.description ?? 'No description yet.'}</div>
        </InfoPanel>
      </section>
    </>
  );
}

function ResourceDetail({ entry, onActivity }: { entry: Extract<LibraryEntry, { kind: 'resource' }>; onActivity: (activityType: string) => Promise<void> }) {
  const resource = entry.resource;

  return (
    <>
      <section className="library-release-hero">
        <div className="library-release-cover">
          {resource.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resource.cover_url} alt="" />
          )}
        </div>
        <div className="library-release-copy">
          <div className="surface-eyebrow">{resource.categories?.name ?? resource.resource_type}</div>
          <h1>{resource.title}</h1>
          <p>by {resource.creators?.name ?? '44 Community'}</p>
        </div>
        <LibraryActionCluster
          primaryLabel="Read"
          onPrimary={() => onActivity('read')}
          onDownload={resource.download_url ? () => {
            onActivity('download');
            window.open(resource.download_url!, '_blank', 'noopener,noreferrer');
          } : undefined}
        />
      </section>
      <InfoPanel title="Saved Resource">
        <div className="library-muted-copy">{resource.summary ?? resource.body ?? 'No resource summary yet.'}</div>
      </InfoPanel>
    </>
  );
}

function ServiceHistoryDetail({ entry }: { entry: Extract<LibraryEntry, { kind: 'service' }> }) {
  const service = entry.request.services;

  return (
    <>
      <section className="library-release-hero">
        <div className="library-release-cover">
          {service?.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.cover_url} alt="" />
          )}
        </div>
        <div className="library-release-copy">
          <div className="surface-eyebrow">{entry.request.status}</div>
          <h1>{service?.title ?? 'Service request'}</h1>
          <p>with {service?.creators?.name ?? '44 Creator'}</p>
        </div>
        <Link className="btn-primary" href={service ? `/services/${service.slug || service.id}` : '/services'}>View Request</Link>
      </section>
      <InfoPanel title="Request">
        <InfoLine label="Status" value={entry.request.status} />
        <InfoLine label="Requested" value={new Date(entry.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        <div className="library-muted-copy">{entry.request.message || service?.description || 'No request note added.'}</div>
      </InfoPanel>
    </>
  );
}

function AchievementPanel({ achievements, unlockedAchievementIds }: { achievements: ProductAchievement[]; unlockedAchievementIds: Set<string> }) {
  if (achievements.length === 0) {
    return (
      <section className="library-panel">
        <div className="surface-eyebrow">Achievements</div>
        <div className="library-muted-copy">Achievements can be added to this item from Supabase.</div>
      </section>
    );
  }

  const unlockedCount = achievements.filter(achievement => unlockedAchievementIds.has(achievement.id)).length;

  return (
    <section className="library-panel">
      <div className="library-panel-header">
        <div className="surface-eyebrow">Achievements</div>
        <span>{unlockedCount} of {achievements.length}</span>
      </div>
      <div className="library-achievement-grid">
        {achievements.map(achievement => {
          const unlocked = unlockedAchievementIds.has(achievement.id);

          return (
            <div key={achievement.id} className={unlocked ? 'library-achievement-card library-achievement-card-unlocked' : 'library-achievement-card'}>
              <div>
                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>
              </div>
              <span>{unlocked ? 'Earned' : achievement.points > 0 ? `${achievement.points} pts` : 'Locked'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LibraryActionCluster({
  primaryLabel,
  onPrimary,
  onDownload,
  reviewHref,
  onHide,
  onArchive,
}: {
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  onDownload?: () => void | Promise<void>;
  reviewHref?: string;
  onHide?: () => void | Promise<void>;
  onArchive?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="library-action-cluster">
      <button className="btn-primary" type="button" onClick={onPrimary}>{primaryLabel}</button>
      <div className="library-options-wrap">
        <button className="library-options-button" type="button" aria-label="Library item options" onClick={() => setOpen(value => !value)}>...</button>
        {open && (
          <div className="library-options-menu">
            <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Share</button>
            {reviewHref && <Link href={reviewHref}>Review</Link>}
            {onDownload && <button type="button" onClick={onDownload}>Download</button>}
            {onHide && <button type="button" onClick={onHide}>Hide</button>}
            {onArchive && <button type="button" onClick={onArchive}>Archive</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="library-info-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="library-panel">
      <div className="surface-eyebrow">{title}</div>
      <div className="library-panel-stack">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="library-info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyPanel({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="library-empty-panel">
      <div>
        <h1>{title}</h1>
        <p>{body}</p>
        <Link className="btn-primary" href={href}>{action}</Link>
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

function groupByProductId<T extends { product_id: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    groups[item.product_id] = [...(groups[item.product_id] ?? []), item];
    return groups;
  }, {});
}

function getProductLibraryAction(product: Product) {
  const category = product.category.toLowerCase();
  const runtime = (product.runtime_type ?? '').toLowerCase();

  if (category === 'books' || runtime === 'book') return { label: 'Read', href: product.read_url || product.download_url, activityType: 'read' };
  if (category === 'interactive' || category === 'games' || runtime === 'interactive' || runtime === 'game') return { label: 'Launch', href: product.launch_url, activityType: 'launch' };
  if (category === 'sample packs' || runtime === 'sample_pack') return { label: 'Download', href: product.download_url, activityType: 'download' };
  if (product.download_url) return { label: 'Download', href: product.download_url, activityType: 'download' };

  return { label: 'Open', href: product.read_url || product.launch_url || product.download_url, activityType: 'open' };
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function updateLibraryItemStatus(key: string, status: 'hidden' | 'archived', setLibraryItems: Dispatch<SetStateAction<LibraryItem[]>>) {
  const id = key.replace('product-', '');
  const { error } = await supabase
    .from('library_items')
    .update({ status })
    .eq('id', id);

  if (error) {
    alert(error.message);
    return;
  }

  setLibraryItems(items => items.filter(item => item.id !== id));
}

async function recordLibraryActivity(userId: string, entry: LibraryEntry, activityType: string) {
  const productId = entry.kind === 'product' ? entry.product.id : null;
  const resourceId = entry.kind === 'resource' ? entry.resource.id : null;

  await supabase.from('library_activity').insert({
    user_id: userId,
    product_id: productId,
    resource_id: resourceId,
    activity_type: activityType,
    metadata: { source: 'library' },
  });
}

async function recordAchievementEvent(userId: string, entry: LibraryEntry, eventType: string, metadata: Record<string, unknown> = {}) {
  const productId = entry.kind === 'product' ? entry.product.id : null;
  const resourceId = entry.kind === 'resource' ? entry.resource.id : null;

  await supabase.from('achievement_events').insert({
    user_id: userId,
    product_id: productId,
    resource_id: resourceId,
    event_type: eventType,
    metadata: { source: 'library', entry_kind: entry.kind, ...metadata },
  });
}

async function recordTrackCompletion(userId: string, entry: Extract<LibraryEntry, { kind: 'product' }>, track: Track) {
  await recordAchievementEvent(userId, entry, 'track_completed', {
    track_id: track.id,
    track_number: track.number,
    track_title: track.title,
  });
}

async function getCompletedTrackIds(userId: string, productId: string) {
  const { data } = await supabase
    .from('achievement_events')
    .select('metadata')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('event_type', 'track_completed');

  return new Set(
    (data ?? [])
      .map(item => {
        const metadata = item.metadata as { track_id?: unknown };
        return typeof metadata.track_id === 'string' ? metadata.track_id : null;
      })
      .filter((trackId): trackId is string => Boolean(trackId))
  );
}

function activityTypeToEventType(activityType: string) {
  if (activityType === 'download') return 'product_downloaded';
  if (activityType === 'read') return 'product_read';
  if (activityType === 'launch') return 'product_launched';
  if (activityType === 'play') return 'product_played';
  return `library_${activityType}`;
}

function achievementToToast(achievement: ProductAchievement): AchievementToastData {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    points: achievement.points,
  };
}

async function unlockAchievementsForTrigger({
  userId,
  productId,
  triggerType,
  achievements,
  unlockedAchievementIds,
  setUnlockedAchievementIds,
}: {
  userId: string;
  productId: string;
  triggerType: string;
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
  setUnlockedAchievementIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const newlyUnlockedIds: string[] = [];
  const newlyUnlockedAchievements: ProductAchievement[] = [];
  const matchingAchievements = achievements.filter(achievement => achievement.trigger_type === triggerType);

  for (const achievement of matchingAchievements) {
    if (unlockedAchievementIds.has(achievement.id)) continue;

    const { error } = await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: achievement.id,
      product_id: productId,
    });

    if (!error) {
      newlyUnlockedIds.push(achievement.id);
      newlyUnlockedAchievements.push(achievement);
      await supabase.from('achievement_events').insert({
        user_id: userId,
        product_id: productId,
        achievement_id: achievement.id,
        event_type: 'achievement_unlocked',
        metadata: { trigger_type: triggerType, achievement_code: achievement.code },
      });
    }
  }

  const completionAchievement = achievements.find(achievement => achievement.trigger_type === 'all_achievements_unlocked');
  if (completionAchievement && !unlockedAchievementIds.has(completionAchievement.id)) {
    const earnedIds = new Set([...Array.from(unlockedAchievementIds), ...newlyUnlockedIds]);
    const requiredAchievements = achievements.filter(achievement => achievement.id !== completionAchievement.id);
    const earnedAllRequired = requiredAchievements.length > 0 && requiredAchievements.every(achievement => earnedIds.has(achievement.id));

    if (earnedAllRequired) {
      const { error } = await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: completionAchievement.id,
        product_id: productId,
      });

      if (!error) {
        newlyUnlockedIds.push(completionAchievement.id);
        newlyUnlockedAchievements.push(completionAchievement);
        await supabase.from('achievement_events').insert({
          user_id: userId,
          product_id: productId,
          achievement_id: completionAchievement.id,
          event_type: 'achievement_unlocked',
          metadata: { trigger_type: completionAchievement.trigger_type, achievement_code: completionAchievement.code },
        });
      }
    }
  }

  if (newlyUnlockedIds.length > 0) {
    setUnlockedAchievementIds(previous => new Set([...Array.from(previous), ...newlyUnlockedIds]));
  }

  return newlyUnlockedAchievements;
}

const FALLBACK_TRACKS: Track[] = [
  { id: 'fallback-track-1', product_id: 'fallback', number: 1, title: 'Track 01', duration_seconds: 61, audio_url: null, download_url: null },
  { id: 'fallback-track-2', product_id: 'fallback', number: 2, title: 'Track 02', duration_seconds: 154, audio_url: null, download_url: null },
  { id: 'fallback-track-3', product_id: 'fallback', number: 3, title: 'Track 03', duration_seconds: 192, audio_url: null, download_url: null },
  { id: 'fallback-track-4', product_id: 'fallback', number: 4, title: 'Track 04', duration_seconds: 178, audio_url: null, download_url: null },
  { id: 'fallback-track-5', product_id: 'fallback', number: 5, title: 'Track 05', duration_seconds: 244, audio_url: null, download_url: null },
  { id: 'fallback-track-6', product_id: 'fallback', number: 6, title: 'Track 06', duration_seconds: 161, audio_url: null, download_url: null },
];
