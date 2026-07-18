'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { creatorHref } from '@/lib/platform';
import { useContextMenu } from '@/components/ContextMenu';
import type { Product } from '@/lib/products';
import { getProductExperience, productBrowseHref } from '@/lib/experience';
import { useAuth } from '@/lib/useAuth';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { addToCart, removeFromCart, useCart } from '@/lib/cart';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { getItemLibraryOwnership, saveItemToLibrary } from '@/lib/domain/itemDetails';
import { Ui44SectionArrow } from '@/components/ui44/Controls';
import { Ui44Text } from '@/components/ui44/Typography';
import { PUBLIC_PURCHASES_AVAILABLE, PURCHASING_COMING_SOON_TITLE, paidSalesUiAvailable } from '@/lib/commerceAvailability';

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="view-hub">{children}</div>;
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="hub-section-head ui44-section-header">
      <div className="hub-section-copy ui44-section-header-copy">
        <Ui44Text as="h2" variant="section-title" className="hub-section-title">{title}</Ui44Text>
      </div>
      {action}
    </div>
  );
}

export function ProductCard({ product, owned: ownedProp }: { product: Product; owned?: boolean }) {
  const { openContextMenu } = useContextMenu();
  const { user } = useAuth();
  const cart = useCart();
  const href = productBrowseHref(product);
  const image = product.cover_url || product.hero_url;
  const creatorLabel = product.creators?.display_name || product.creator || '44 Creator';
  const experience = getProductExperience(product);
  const shape = experience === 'physical' ? 'portrait' : experience === 'book' ? 'book' : 'square';
  const [owned, setOwned] = useState(Boolean(ownedProp));

  useEffect(() => {
    let alive = true;
    async function loadOwned() {
      if (typeof ownedProp === 'boolean') {
        setOwned(ownedProp);
        return;
      }
      if (!user) {
        setOwned(false);
        return;
      }
      const data = await getItemLibraryOwnership(user.id, product.id);
      if (alive) setOwned(Boolean(data));
    }
    loadOwned();
    return () => { alive = false; };
  }, [ownedProp, product.id, user]);

  async function addProductToLibrary() {
    if (!user) return;
    try {
      await saveItemToLibrary(user.id, product.id);
      setOwned(true);
    } catch {
      // The detail page presents actionable acquisition errors; cards stay non-disruptive.
    }
  }

  function copyShareLink() {
    const url = typeof window !== 'undefined' ? new URL(href, window.location.origin) : null;
    if (url && user?.id) url.searchParams.set('ref', user.id);
    navigator.clipboard?.writeText(url?.toString() ?? href);
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, {
      detail: { message: 'Link copied to clipboard' },
    }));
  }

  const entries = [
    { id: 'open', label: 'View Item', href },
    ...(experience === 'physical' ? [] : [{ id: 'creator', label: 'View Creator', href: creatorHref(product.creators ?? product.creator) }]),
    ...resolveProductActionEntries({
      product,
      experience,
      userId: user?.id ?? null,
      owned,
      inCart: cart.has(product.id),
      onAddToLibrary: addProductToLibrary,
      onToggleCart: () => {
        if (cart.has(product.id)) removeFromCart(product.id);
        else addToCart({
          item_id: product.id,
          title: product.title,
          creator: product.creators?.display_name || product.creator || '44 Creator',
          item_type: product.item_type ?? null,
          cover_url: product.cover_url,
          price_cents: product.price_cents,
          currency: 'USD',
          slug: product.slug ?? null,
          href,
        });
      },
    }),
    { id: 'share', label: 'Share Link', onSelect: copyShareLink },
  ];

  return (
    <Link
      href={href}
      className="product-tile ui44-catalog-card"
      onContextMenu={event => openContextMenu(event, entries)}
    >
      <div className={`product-tile-art product-tile-art-${shape} ui44-catalog-art`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" />
        )}
      </div>
      <div className="product-tile-info ui44-catalog-copy">
        <div className="product-tile-title ui44-catalog-title">{product.title}</div>
        <div className="product-tile-subtitle product-tile-creator ui44-catalog-subheadline">{creatorLabel}</div>
      </div>
    </Link>
  );
}

function resolveProductActionEntries({
  product,
  experience,
  userId,
  owned,
  inCart,
  onAddToLibrary,
  onToggleCart,
}: {
  product: Product;
  experience: ReturnType<typeof getProductExperience>;
  userId: string | null;
  owned: boolean;
  inCart: boolean;
  onAddToLibrary: () => Promise<void>;
  onToggleCart: () => void;
}) {
  const paidSalesAvailable = paidSalesUiAvailable(product);
  if (experience === 'music') {
    return [
      ...(!owned ? [{
        id: 'library',
        label: 'Add to Library',
        onSelect: () => {
          if (!userId) return;
          void onAddToLibrary();
        },
        disabled: !userId,
      }] : []),
      ...(PUBLIC_PURCHASES_AVAILABLE && paidSalesAvailable && product.download_purchase_enabled && product.price_cents > 0 ? [{
        id: 'download',
        label: inCart ? 'View Download Cart' : 'Buy Download',
        onSelect: onToggleCart,
      }] : []),
    ];
  }

  if (experience === 'physical' || (!product.is_free && !isFreeLibraryClaim(product))) {
    if (!PUBLIC_PURCHASES_AVAILABLE) {
      return [{ id: 'purchase-status', label: PURCHASING_COMING_SOON_TITLE, disabled: true }];
    }
    if (!paidSalesAvailable) {
      return [{ id: 'purchase-status', label: 'Paid sales unavailable', disabled: true }];
    }
    if (experience === 'physical') {
      return [{ id: 'options', label: inCart ? 'Review Selected Options' : 'Choose Options', href: productBrowseHref(product) }];
    }
    return [
      {
        id: 'cart',
        label: inCart ? 'Remove from Purchase Cart' : 'Buy Download',
        onSelect: onToggleCart,
      },
    ];
  }

  if (owned) return [];

  return [
    {
      id: 'library',
      label: 'Add to Library',
      onSelect: () => {
        if (!userId) return;
        void onAddToLibrary();
      },
      disabled: !userId,
    },
  ];
}

export function HubHero({
  title,
  actions,
  className = '',
}: {
  title: string;
  copy?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`app-header ui44-page-header ${className}`.trim()}>
      <div className="app-header-copy ui44-page-header-copy">
        <Ui44Text as="h1" variant="page-title">{title}</Ui44Text>
      </div>
      {actions}
    </header>
  );
}

export function HubSection({
  title,
  description,
  href,
  action,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="app-section">
      <SectionHeader
        title={title}
        description={description}
        action={action ?? (href ? <Ui44SectionArrow href={href} label={`View all ${title}`} /> : undefined)}
      />
      {children}
    </section>
  );
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="app-grid ui44-catalog-grid">{children}</div>;
}

/* Plain text empty state — no panel, no shadow, no card. Cards are for
   clickable stuff; empty pages should just be quiet copy. */
export function EmptyMessage({ children, status = false }: { children: ReactNode; status?: boolean }) {
  return (
    <div
      className={`app-empty-text ui44-state ${status ? 'ui44-state-loading' : 'ui44-state-empty'}`}
      role={status ? 'status' : undefined}
      aria-live={status ? 'polite' : undefined}
    >
      {children}
    </div>
  );
}

export function CenteredMessage({ children, status = false }: { children: ReactNode; status?: boolean }) {
  return (
    <div
      className={`app-centered os-type-body ui44-state ui44-route-state${status ? ' ui44-state-loading' : ''}`}
      role={status ? 'status' : undefined}
      aria-live={status ? 'polite' : undefined}
    >
      {children}
    </div>
  );
}
