'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SystemPanel } from '@/components/SystemPanel';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductRuntimeKind } from '@/lib/libraryContent';
import { formatServicePrice, type Resource, type SavedResource, type ServiceRequest } from '@/lib/platform';

interface LibraryItem {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: 'visible' | 'hidden' | 'archived';
  products: Product | null;
}

type LibraryEntry =
  | {
      id: string;
      kind: 'product';
      tab: LibraryTabId;
      title: string;
      subtitle: string;
      meta: string;
      image: string | null;
      href: string;
      product: Product;
    }
  | {
      id: string;
      kind: 'resource';
      tab: 'resources';
      title: string;
      subtitle: string;
      meta: string;
      image: string | null;
      href: string;
      resource: Resource;
    }
  | {
      id: string;
      kind: 'service';
      tab: 'services';
      title: string;
      subtitle: string;
      meta: string;
      image: string | null;
      href: string;
      request: ServiceRequest;
    };

type LibraryTabId = 'music' | 'books' | 'games' | 'products';

const TAB_LABELS: Record<LibraryEntry['tab'] | 'all', string> = {
  all: 'All Items',
  music: 'Music',
  books: 'Books',
  games: 'Games',
  products: 'Products',
  resources: 'Resources',
  services: 'Services',
};

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
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

    async function fetchLibrary(userId: string) {
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
          .select('id,resource_id,saved_at,resources(*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false }),
        supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (productsError) {
        setError(`${productsError.message}. Run the Library Supabase rename SQL, then refresh.`);
      }

      setLibraryItems((products as LibraryItem[] | null) ?? []);
      setSavedResources((resources as SavedResource[] | null) ?? []);
      setServiceRequests((requests as ServiceRequest[] | null) ?? []);
      setLoading(false);
    }

    fetchLibrary(user.id);
  }, [authLoading, user]);

  const entries = useMemo<LibraryEntry[]>(() => {
    const products = libraryItems.flatMap(item => {
      if (!item.products) return [];
      const tab = productTab(item.products);

      return [{
        id: item.id,
        kind: 'product' as const,
        tab,
        title: item.products.title,
        subtitle: item.products.creator,
        meta: formatProductPrice(item.products),
        image: item.products.cover_url,
        href: `/library/item/product/${item.id}`,
        product: item.products,
      }];
    });

    const resources = savedResources.flatMap(item => {
      if (!item.resources) return [];

      return [{
        id: item.id,
        kind: 'resource' as const,
        tab: 'resources' as const,
        title: item.resources.title,
        subtitle: item.resources.creators?.name ?? '44 Community',
        meta: item.resources.categories?.name ?? item.resources.resource_type,
        image: item.resources.cover_url,
        href: `/library/item/resource/${item.id}`,
        resource: item.resources,
      }];
    });

    const services = serviceRequests.flatMap(item => {
      if (!item.services) return [];

      return [{
        id: item.id,
        kind: 'service' as const,
        tab: 'services' as const,
        title: item.services.title,
        subtitle: item.services.creators?.name ?? '44 Creator',
        meta: `${formatServicePrice(item.services)} · ${item.status}`,
        image: item.services.cover_url,
        href: `/library/item/service/${item.id}`,
        request: item,
      }];
    });

    return [...products, ...resources, ...services];
  }, [libraryItems, savedResources, serviceRequests]);

  const tabs = useMemo(() => {
    const order: LibraryEntry['tab'][] = ['music', 'books', 'games', 'products', 'resources', 'services'];
    const filtered = order.filter(tab => entries.some(entry => entry.tab === tab));
    if (filtered.length === 0) return [];
    return [
      { id: 'all', label: TAB_LABELS.all },
      ...filtered.map(tab => ({ id: tab, label: TAB_LABELS[tab] })),
    ];
  }, [entries]);

  if (authLoading || loading) {
    return <CenteredMessage>Loading...</CenteredMessage>;
  }

  if (!user) {
    return <CenteredMessage>Sign in to view your library</CenteredMessage>;
  }

  if (error) {
    return <CenteredMessage>{error}</CenteredMessage>;
  }

  if (entries.length === 0 || tabs.length === 0) {
    return (
      <div className="panel-scroll">
        <SystemPanel tabs={[{ id: 'empty', label: 'Library' }]} avatar={<LibraryAddButton />}>
          {() => (
            <div className="library-empty-panel">
              <div>
                <h1>Your library is empty</h1>
                <p>Add products, save resources, or request services to start building your 44 library.</p>
                <Link className="os-button os-button-primary" href="/">Browse Store</Link>
              </div>
            </div>
          )}
        </SystemPanel>
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={tabs} defaultTab="all">
        {activeTab => {
          const activeEntries = activeTab === 'all'
            ? entries
            : entries.filter(entry => entry.tab === activeTab);
          const label = TAB_LABELS[activeTab as LibraryEntry['tab'] | 'all'];

          return (
            <div className="library-system-section">
              <div className="library-system-heading">
                <h1>{label}</h1>
                <p>{activeEntries.length} item{activeEntries.length === 1 ? '' : 's'}</p>
              </div>
              <div className="library-grid">
                {activeEntries.map(entry => <LibraryCard key={entry.id} entry={entry} />)}
              </div>
            </div>
          );
        }}
      </SystemPanel>
    </div>
  );
}

function productTab(product: Product): LibraryTabId {
  const runtimeKind = getProductRuntimeKind(product);
  if (runtimeKind === 'music') return 'music';
  if (runtimeKind === 'book') return 'books';
  if (runtimeKind === 'interactive') return 'games';
  return 'products';
}

function LibraryCard({ entry }: { entry: LibraryEntry }) {
  const artShape = entry.kind === 'product'
    ? productArtShape(entry.product)
    : 'wide';

  return (
    <Link className="product-tile" href={entry.href}>
      <span className={`product-tile-art product-tile-art-${artShape}`}>
        {entry.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt="" />
        )}
      </span>
      <span className="product-tile-info">
        <span className="product-tile-title">{entry.title}</span>
        <span className="product-tile-subtitle">{entry.subtitle}</span>
      </span>
    </Link>
  );
}

function productArtShape(product: Product): 'square' | 'portrait' | 'book' | 'landscape' {
  const category = (product.category || '').toLowerCase();
  if (category === 'books') return 'book';
  if (category === 'assets') return 'landscape';
  if (category === 'apparel' || category === 'merch' || category === 'games') return 'portrait';
  return 'square';
}

function LibraryAddButton() {
  return (
    <button className="library-add-button" type="button" aria-label="Create library">
      +
    </button>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--os-color-ink-muted)', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}
