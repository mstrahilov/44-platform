'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductRuntimeKind } from '@/lib/libraryContent';
import { formatServicePrice, type ServiceRequest } from '@/lib/platform';

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
  services: 'Services',
};

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryEntry['tab'] | 'all'>('all');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      Promise.resolve().then(() => {
        setLibraryItems([]);
        setServiceRequests([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    async function fetchLibrary(userId: string) {
      setLoading(true);
      setError(null);

      const [{ data: products, error: productsError }, { data: requests }] = await Promise.all([
        supabase
          .from('library_items')
          .select('id,product_id,acquisition_type,acquired_at,status,products(*)')
          .eq('user_id', userId)
          .neq('status', 'archived')
          .neq('status', 'hidden')
          .order('acquired_at', { ascending: false }),
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

    return [...products, ...services];
  }, [libraryItems, serviceRequests]);

  const availableTabs = useMemo<Array<LibraryEntry['tab'] | 'all'>>(() => {
    const order: LibraryEntry['tab'][] = ['music', 'books', 'games', 'products', 'services'];
    const filtered = order.filter(tab => entries.some(entry => entry.tab === tab));
    if (filtered.length === 0) return [];
    return ['all', ...filtered];
  }, [entries]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  useTopbarTabs(
    availableTabs.length > 0
      ? availableTabs.map(tab => ({
          id: tab,
          label: TAB_LABELS[tab],
          onClick: () => setActiveTab(tab),
          active: tab === activeTab,
        }))
      : undefined,
  );

  if (authLoading || loading) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  if (!user) {
    return <PageShell><CenteredMessage>Sign in to view your library</CenteredMessage></PageShell>;
  }

  if (error) {
    return <PageShell><CenteredMessage>{error}</CenteredMessage></PageShell>;
  }

  if (entries.length === 0 || availableTabs.length === 0) {
    return (
      <PageShell>
        <div className="app-page">
          <HubHero title="Library" copy={LIBRARY_HERO_COPY} />
          <div className="app-empty-text">
            Your library is empty. Add products or request services to start building your 44 library.
          </div>
          <div style={{ marginTop: 16 }}>
            <Link className="os-button os-button-primary" href="/store">Browse Store</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const activeEntries = activeTab === 'all'
    ? entries
    : entries.filter(entry => entry.tab === activeTab);

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title="Library" copy={LIBRARY_HERO_COPY} />
        <div className="app-grid">
          {activeEntries.map(entry => <LibraryCard key={entry.id} entry={entry} />)}
        </div>
      </div>
    </PageShell>
  );
}

const LIBRARY_HERO_COPY = 'Products you own and services you have in progress on 44.';

function productTab(product: Product): LibraryTabId {
  const runtimeKind = getProductRuntimeKind(product);
  if (runtimeKind === 'music') return 'music';
  if (runtimeKind === 'book') return 'books';
  if (runtimeKind === 'interactive') return 'games';
  return 'products';
}

function LibraryCard({ entry }: { entry: LibraryEntry }) {
  return (
    <Link className="product-tile" href={entry.href}>
      <span className="product-tile-art product-tile-art-square">
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
