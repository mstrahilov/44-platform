'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import type { Resource, SavedResource, ServiceRequest } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel, PanelListItem } from '@/components/Ui';

interface LibraryItem {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
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
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      Promise.resolve().then(() => {
        setLibraryItems([]);
        setSavedResources([]);
        setServiceRequests([]);
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
          .select('id,product_id,acquisition_type,acquired_at,products(*)')
          .eq('user_id', userId)
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
          <LibraryDetail entry={selectedEntry} />
        )}
      </DockedContent>
    </DockedLayout>
  );
}

function LibraryDetail({ entry }: { entry: LibraryEntry }) {
  if (entry.kind === 'resource') {
    return <ResourceDetail entry={entry} />;
  }

  if (entry.kind === 'service') {
    return <ServiceHistoryDetail entry={entry} />;
  }

  const product = entry.product;
  const isMusic = product.category.toLowerCase() === 'music';

  if (!isMusic) {
    return <ProductLibraryDetail entry={entry} />;
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
        <button className="btn-primary" type="button">Play</button>
      </section>

      <section className="library-stats-grid">
        <InfoCard value={product.year ? String(product.year) : 'Now'} label="Release Year" />
        <InfoCard value={product.product_type} label="Format" />
        <InfoCard value={new Date(entry.acquiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} label="Added" />
      </section>

      <section className="library-panel">
        <div className="library-panel-header">
          <div className="surface-eyebrow">Tracklist</div>
          <span>{TRACKS.length} tracks</span>
        </div>
        <div className="library-track-list">
          {TRACKS.map((track, index) => (
            <div className="library-track-row" key={track.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <button type="button" aria-label={`Play ${track.title}`}>▶</button>
              <strong>{track.title}</strong>
              <em>{track.length}</em>
            </div>
          ))}
        </div>
      </section>

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

function ProductLibraryDetail({ entry }: { entry: Extract<LibraryEntry, { kind: 'product' }> }) {
  const product = entry.product;

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

function ResourceDetail({ entry }: { entry: Extract<LibraryEntry, { kind: 'resource' }> }) {
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
      </section>
      <InfoPanel title="Request">
        <InfoLine label="Status" value={entry.request.status} />
        <InfoLine label="Requested" value={new Date(entry.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        <div className="library-muted-copy">{entry.request.message || service?.description || 'No request note added.'}</div>
      </InfoPanel>
    </>
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

const TRACKS = [
  { title: 'Track 01', length: '1:01' },
  { title: 'Track 02', length: '2:34' },
  { title: 'Track 03', length: '3:12' },
  { title: 'Track 04', length: '2:58' },
  { title: 'Track 05', length: '4:04' },
  { title: 'Track 06', length: '2:41' },
];
