'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseIndexHref, getProductExperience, productLibraryHref, type ProductExperience } from '@/lib/experience';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { creatorHref } from '@/lib/platform';
import { PageShell, HubHero, ProductCard, ProductGrid, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { listPlayableItemTracks, listPublishedCatalogItems } from '@/lib/domain/catalog';
import {
  hideLibraryItem,
  listVisibleLibraryItemIds,
  listVisibleLibraryItems,
  removeLibraryItem,
  type LibraryItemRow,
} from '@/lib/domain/library';

type ExperienceRoute = 'library' | 'store';

type ExperienceConfig = {
  id: 'music' | 'books' | 'assets';
  title: string;
  libraryTitle: string;
  storeTitle: string;
  noun: string;
  pluralNoun: string;
  experience: ProductExperience;
  copy: Record<ExperienceRoute, string>;
};

const EXPERIENCE_CONFIG: Record<ExperienceConfig['id'], ExperienceConfig> = {
  music: {
    id: 'music',
    title: 'Music',
    libraryTitle: 'Music Library',
    storeTitle: 'Music',
    noun: 'release',
    pluralNoun: 'releases',
    experience: 'music',
    copy: {
      library: 'Albums, singles, EPs, and owned releases you have saved or purchased.',
      store: 'Browse releases from creators and add them to your Music Library.',
    },
  },
  books: {
    id: 'books',
    title: 'Books',
    libraryTitle: 'Books Library',
    storeTitle: 'Books',
    noun: 'book',
    pluralNoun: 'books',
    experience: 'book',
    copy: {
      library: 'Digital books and artbooks you own.',
      store: 'Browse digital books and artbooks from creators.',
    },
  },
  assets: {
    id: 'assets',
    title: 'Assets',
    libraryTitle: 'Assets Library',
    storeTitle: 'Assets',
    noun: 'asset',
    pluralNoun: 'assets',
    experience: 'asset',
    copy: {
      library: 'Samples, templates, presets, and creator tools you own.',
      store: 'Browse useful assets and creator tools and add them to your Assets Library.',
    },
  },
};

export function ExperienceApp({ app, route }: { app: ExperienceConfig['id']; route: ExperienceRoute }) {
  const config = EXPERIENCE_CONFIG[app];
  const router = useRouter();
  const { openContextMenu } = useContextMenu();
  const { playQueue } = useMusicPlayer();
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItemRow[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route !== 'store') return;

    async function loadStore() {
      setLoading(true);
      const data = await listPublishedCatalogItems();
      setProducts(data.filter(product => getProductExperience(product) === config.experience));
      setLoading(false);
    }

    loadStore();
  }, [config.experience, route]);

  useEffect(() => {
    if (route !== 'library' || authLoading) return;
    if (!user) {
      Promise.resolve().then(() => {
        setLibraryItems([]);
        setLoading(false);
      });
      return;
    }

    async function loadLibrary(userId: string) {
      setLoading(true);
      const rows = (await listVisibleLibraryItems(userId))
        .filter(row => row.products && getProductExperience(row.products) === config.experience);
      setLibraryItems(rows);
      setLoading(false);
    }

    loadLibrary(user.id);
  }, [authLoading, config.experience, route, user]);

  useEffect(() => {
    if (route !== 'store' || !user) {
      Promise.resolve().then(() => setOwnedProductIds([]));
      return;
    }

    async function loadOwned(userId: string) {
      setOwnedProductIds(await listVisibleLibraryItemIds(userId));
    }

    loadOwned(user.id);
  }, [route, user]);

  const title = route === 'library' ? config.libraryTitle : config.storeTitle;
  const copy = config.copy[route];

  const libraryProducts = useMemo(() => (
    libraryItems.flatMap(row => (row.products ? [{ row, rowId: row.id, product: row.products }] : []))
  ), [libraryItems]);

  async function playProduct(product: Product, fallbackHref: string) {
    const tracks = await listPlayableItemTracks(product.id);
    const queue: MusicQueueTrack[] = tracks
      .filter(track => track.audio_url)
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: product.creator || '44 Creator',
        releaseTitle: product.title,
        artworkUrl: product.cover_url || product.hero_url || null,
        audioUrl: track.audio_url as string,
        durationSeconds: track.duration_seconds,
        productId: product.id,
        artistHref: creatorHref(product.creators ?? product.creator),
        releaseHref: fallbackHref,
      }));
    if (queue.length > 0) playQueue(queue);
    else router.push(fallbackHref);
  }

  async function removeLibraryRow(row: LibraryItemRow, free: boolean) {
    if (!user) return;
    try {
      if (free) await removeLibraryItem(user.id, row.id);
      else await hideLibraryItem(user.id, row.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update your Library.');
      return;
    }
    setLibraryItems(current => current.filter(entry => entry.id !== row.id));
  }

  function libraryTileEntries(row: LibraryItemRow, product: Product): ContextMenuEntry[] {
    const ownedHref = productLibraryHref(product, row.id);
    const free = row.acquisition_type === 'free' || isFreeLibraryClaim(product);

    const primary: ContextMenuEntry =
      config.id === 'music'
        ? { id: 'play', label: 'Play', onSelect: () => { void playProduct(product, ownedHref); } }
        : config.id === 'books'
          ? product.read_url
            ? { id: 'read', label: 'Read', onSelect: () => window.open(product.read_url as string, '_blank', 'noopener') }
            : { id: 'read', label: 'Read', href: ownedHref }
          : product.download_url
            ? { id: 'download', label: 'Download', onSelect: () => window.open(product.download_url as string, '_blank', 'noopener') }
            : { id: 'download', label: 'Download', href: ownedHref };

    return [
      primary,
      { id: 'open', label: `Open ${config.noun.charAt(0).toUpperCase()}${config.noun.slice(1)}`, href: ownedHref },
      { id: 'creator', label: 'View Creator', href: creatorHref(product.creators ?? product.creator) },
      { kind: 'divider', id: 'divider-1' },
      free
        ? { id: 'remove', label: 'Remove from Library', danger: true, onSelect: () => { void removeLibraryRow(row, true); } }
        : { id: 'hide', label: 'Hide from Library', danger: true, onSelect: () => { void removeLibraryRow(row, false); } },
    ];
  }

  if (authLoading && route === 'library') {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (route === 'library' && !user) {
    return (
      <PageShell>
        <main className="app-page">
          <HubHero title={title} copy={copy} />
          <EmptyMessage>Sign in to open your {config.title} Library.</EmptyMessage>
          <div style={{ marginTop: 'var(--os-space-4)' }}>
            <Link className="os-button os-button-primary" href="/login">Log In</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title={title} copy={copy} />

        {loading ? (
          <EmptyMessage>Loading...</EmptyMessage>
        ) : route === 'library' ? (
          libraryProducts.length === 0 ? (
            <>
              <EmptyMessage>No {config.pluralNoun} in your Library yet.</EmptyMessage>
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary" href={browseIndexHref(config.id)}>
                  Explore {config.title}
                </Link>
              </div>
            </>
          ) : (
            <ProductGrid>
              {libraryProducts.map(({ row, rowId, product }) => (
                <Link
                  key={rowId}
                  className="product-tile"
                  href={productLibraryHref(product, rowId)}
                  onContextMenu={event => openContextMenu(event, libraryTileEntries(row, product))}
                >
                  <span className="product-tile-art product-tile-art-square">
                    {(product.cover_url || product.hero_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.cover_url || product.hero_url || ''} alt="" />
                    )}
                  </span>
                  <span className="product-tile-info">
                    <span className="product-tile-title">{product.title}</span>
                    <span className="product-tile-subtitle">{product.creator || '44 Creator'}</span>
                  </span>
                </Link>
              ))}
            </ProductGrid>
          )
        ) : products.length === 0 ? (
          <EmptyMessage>No {config.pluralNoun} are published yet.</EmptyMessage>
        ) : (
          <ProductGrid>
            {products.map(product => (
              <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} />
            ))}
          </ProductGrid>
        )}
      </main>
    </PageShell>
  );
}
