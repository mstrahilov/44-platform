'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SystemPanel } from '@/components/SystemPanel';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductRuntimeKind } from '@/lib/collectionContent';
import type { Resource, SavedResource, ServiceRequest } from '@/lib/platform';

interface CollectionItem {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: 'visible' | 'hidden' | 'archived';
  products: Product | null;
}

type CollectionEntry =
  | {
      id: string;
      kind: 'product';
      tab: CollectionTabId;
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

type CollectionTabId = 'music' | 'books' | 'games' | 'products';

const TAB_LABELS: Record<CollectionEntry['tab'], string> = {
  music: 'Music',
  books: 'Books',
  games: 'Games',
  products: 'Products',
  resources: 'Resources',
  services: 'Services',
};

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      Promise.resolve().then(() => {
        setCollectionItems([]);
        setSavedResources([]);
        setServiceRequests([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    async function fetchCollection(userId: string) {
      setLoading(true);
      setError(null);

      const [{ data: products, error: productsError }, { data: resources }, { data: requests }] = await Promise.all([
        supabase
          .from('collection_items')
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
        setError(`${productsError.message}. Run the Collection Supabase rename SQL, then refresh.`);
      }

      setCollectionItems((products as CollectionItem[] | null) ?? []);
      setSavedResources((resources as SavedResource[] | null) ?? []);
      setServiceRequests((requests as ServiceRequest[] | null) ?? []);
      setLoading(false);
    }

    fetchCollection(user.id);
  }, [authLoading, user]);

  const entries = useMemo<CollectionEntry[]>(() => {
    const products = collectionItems.flatMap(item => {
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
        href: `/collection/item/product/${item.id}`,
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
        href: `/collection/item/resource/${item.id}`,
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
        meta: item.status,
        image: item.services.cover_url,
        href: `/collection/item/service/${item.id}`,
        request: item,
      }];
    });

    return [...products, ...resources, ...services];
  }, [collectionItems, savedResources, serviceRequests]);

  const tabs = useMemo(() => {
    const order: CollectionEntry['tab'][] = ['music', 'books', 'games', 'products', 'resources', 'services'];
    return order
      .filter(tab => entries.some(entry => entry.tab === tab))
      .map(tab => ({ id: tab, label: TAB_LABELS[tab] }));
  }, [entries]);

  if (authLoading || loading) {
    return <CenteredMessage>Loading...</CenteredMessage>;
  }

  if (!user) {
    return <CenteredMessage>Sign in to view your collection</CenteredMessage>;
  }

  if (error) {
    return <CenteredMessage>{error}</CenteredMessage>;
  }

  if (entries.length === 0 || tabs.length === 0) {
    return (
      <div className="panel-scroll">
        <SystemPanel tabs={[{ id: 'empty', label: 'Collection' }]} avatar={<CollectionAddButton />}>
          {() => (
            <div className="collection-empty-panel">
              <div>
                <h1>Your collection is empty</h1>
                <p>Add products, save resources, or request services to start building your 44 collection.</p>
                <Link className="btn-primary" href="/browse">Browse Store</Link>
              </div>
            </div>
          )}
        </SystemPanel>
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={tabs} avatar={<CollectionAddButton />}>
        {activeTab => {
          const activeEntries = entries.filter(entry => entry.tab === activeTab);

          return (
            <div className="collection-system-section">
              <div className="collection-system-heading">
                <h1>{TAB_LABELS[activeTab as CollectionEntry['tab']]}</h1>
                <p>{activeEntries.length} item{activeEntries.length === 1 ? '' : 's'}</p>
              </div>
              <div className="collection-grid">
                {activeEntries.map(entry => <CollectionCard key={entry.id} entry={entry} />)}
              </div>
            </div>
          );
        }}
      </SystemPanel>
    </div>
  );
}

function productTab(product: Product): CollectionTabId {
  const runtimeKind = getProductRuntimeKind(product);
  if (runtimeKind === 'music') return 'music';
  if (runtimeKind === 'book') return 'books';
  if (runtimeKind === 'interactive') return 'games';
  return 'products';
}

function CollectionCard({ entry }: { entry: CollectionEntry }) {
  return (
    <Link className="collection-grid-card" href={entry.href}>
      <span className="collection-grid-art">
        {entry.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt="" />
        )}
      </span>
      <span className="collection-grid-copy">
        <strong>{entry.title}</strong>
        <span>{entry.subtitle}</span>
        <em>{entry.meta}</em>
      </span>
    </Link>
  );
}

function CollectionAddButton() {
  return (
    <button className="collection-add-button" type="button" aria-label="Create collection">
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
