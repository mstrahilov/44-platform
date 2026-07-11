'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { CommunityPost } from '@/lib/platform';
import { communityThreadHref, creatorHref } from '@/lib/platform';
import { useContextMenu } from '@/components/ContextMenu';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductExperience, productBrowseHref } from '@/lib/experience';
import { getPostMetaLabel } from '@/lib/social';
import { useAuth } from '@/lib/useAuth';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { addToCart, removeFromCart, useCart } from '@/lib/cart';
import { supabase } from '@/lib/supabase';
import { isFreeLibraryClaim } from '@/lib/libraryContent';

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="view-hub">{children}</div>;
}

export function GlassPanel({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`glass-panel ${className}`} style={style}>
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={description ? 'hub-section-head hub-section-head-described' : 'hub-section-head'}>
      <div className="hub-section-copy">
        <h2 className="hub-section-title">{title}</h2>
        {description && <p className="hub-section-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function DockedLayout({ side = 'left', children }: { side?: 'left' | 'right'; children: ReactNode }) {
  return <div className={`docked-layout docked-layout-${side}`}>{children}</div>;
}

export function DockedPanel({ children }: { children: ReactNode }) {
  return <aside className="docked-panel">{children}</aside>;
}

export function DockedContent({ children }: { children: ReactNode }) {
  return <main className="docked-content">{children}</main>;
}

export function PanelListItem({
  active,
  eyebrow,
  title,
  subtitle,
  image,
  onClick,
}: {
  active?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  onClick?: () => void;
}) {
  return (
    <button className={active ? 'panel-list-item panel-list-item-active' : 'panel-list-item'} onClick={onClick} type="button">
      <span className="panel-list-thumb">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        )}
      </span>
      <span className="panel-list-copy">
        {eyebrow && <span className="panel-list-eyebrow">{eyebrow}</span>}
        <span className="panel-list-title">{title}</span>
        {subtitle && <span className="panel-list-subtitle">{subtitle}</span>}
      </span>
    </button>
  );
}

export function ProductCard({ product, owned: ownedProp }: { product: Product; owned?: boolean }) {
  const { openContextMenu } = useContextMenu();
  const { user } = useAuth();
  const cart = useCart();
  const href = productBrowseHref(product);
  const image = product.cover_url || product.hero_url;
  const shape = getProductTileShape(product);
  const subtitle = getProductTileSubtitle(product);
  const experience = getProductExperience(product);
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
      const { data } = await supabase
        .from('library_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', product.id)
        .neq('status', 'hidden')
        .maybeSingle();
      if (alive) setOwned(Boolean(data));
    }
    loadOwned();
    return () => { alive = false; };
  }, [ownedProp, product.id, user]);

  async function addProductToLibrary() {
    if (!user) return;
    await supabase.from('library_entries').upsert({
      user_id: user.id,
      item_id: product.id,
      acquisition_type: 'free',
      status: 'visible',
    }, { onConflict: 'user_id,item_id' });
    setOwned(true);
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
    { id: 'creator', label: 'View Creator', href: creatorHref(product.creators ?? product.creator) },
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
      className="product-tile"
      onContextMenu={event => openContextMenu(event, entries)}
    >
      <div className={`product-tile-art product-tile-art-${shape}`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" />
        )}
      </div>
      <div className="product-tile-info">
        <div className="product-tile-title">{product.title}</div>
        <div className="product-tile-subtitle">{subtitle}</div>
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
  if (experience === 'music') {
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

  if (experience === 'physical' || (!product.is_free && !isFreeLibraryClaim(product))) {
    return [
      {
        id: 'cart',
        label: inCart ? 'Remove from Cart' : 'Add to Cart',
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

function getProductTileShape(product: Product): 'square' | 'portrait' | 'book' | 'landscape' {
  const experience = getProductExperience(product);
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'landscape';
  if (experience === 'physical' || experience === 'interactive') return 'portrait';
  return 'square'; // music (and any unknown category)
}

// Merch, apparel, assets → price. Music, games, books → creator/author.
function getProductTileSubtitle(product: Product): string {
  const experience = getProductExperience(product);
  if (experience === 'physical' || experience === 'asset') {
    return formatProductPrice(product);
  }
  return product.creator || 'Creator';
}

export function PostCard({ post }: { post: CommunityPost }) {
  const { openContextMenu } = useContextMenu();
  const href = communityThreadHref(post);
  return (
    <Link
      href={href}
      className="app-card"
      onContextMenu={event =>
        openContextMenu(event, [
          { id: 'open', label: 'Open Post', href },
          { id: 'author', label: 'View Author', href: creatorHref(post.creators ?? '44 Community') },
        ])
      }
    >
      <div className="app-card-body">
        <span className="os-pill os-type-pill app-card-chip">{getPostMetaLabel()}</span>
        <div className="app-card-creator os-type-meta">by {post.creators?.name ?? '44 Community'}</div>
        <div className="app-card-desc os-type-body-small">{post.body}</div>
      </div>
    </Link>
  );
}

export function ThreadRow({
  post,
  replyCount = 0,
  likeCount = 0,
  pinned = false,
}: {
  post: CommunityPost;
  replyCount?: number;
  likeCount?: number;
  pinned?: boolean;
}) {
  const author = post.creators?.name ?? '44 Community';
  const meta = getPostMetaLabel();

  return (
    <Link href={communityThreadHref(post)} className="thread-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          {pinned && (
            <span className="os-pill os-type-pill" style={{ color: 'var(--os-color-accent)' }}>
              Pinned
            </span>
          )}
          <span className="os-pill os-type-pill">{meta}</span>
        </div>
        <div className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.body}
        </div>
        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
          by {author}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, justifyItems: 'end', minWidth: 110 }}>
        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
          {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="os-type-meta" style={{ display: 'flex', gap: 14, color: 'var(--os-color-ink-secondary)' }}>
          <span>{likeCount} likes</span>
          <span>{replyCount} replies</span>
        </div>
      </div>
    </Link>
  );
}

export function CategoryCard({ label, href, icon }: { label: string; href: string; icon?: string }) {
  return (
    <Link href={href} className="os-category-card os-category-icon-card">
      {icon && (
        <div className="os-category-icon">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" />
        </div>
      )}
      <div className="os-category-card-title os-type-section-title">{label}</div>
    </Link>
  );
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
    <header className={`app-header ${className}`.trim()}>
      <div className="app-header-copy">
        <h1 className="os-type-display">{title}</h1>
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
        action={action ?? (href ? <Link href={href} className="os-button os-button-primary">View All</Link> : undefined)}
      />
      {children}
    </section>
  );
}

export function Shelf({ children }: { children: ReactNode }) {
  return <div className="app-shelf">{children}</div>;
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="app-grid">{children}</div>;
}

export function EmptyPanel({ title, body }: { title: string; body?: string }) {
  return (
    <div className="app-empty">
      <div className="os-type-section-title">{title}</div>
      {body && (
        <p className="os-type-body" style={{ marginTop: 'var(--os-space-2)', color: 'var(--os-color-ink-secondary)' }}>{body}</p>
      )}
    </div>
  );
}

/* Plain text empty state — no panel, no shadow, no card. Cards are for
   clickable stuff; empty pages should just be quiet copy. */
export function EmptyMessage({ children }: { children: ReactNode }) {
  return <div className="app-empty-text">{children}</div>;
}

export function DetailLayout({ children, inspector }: { children: ReactNode; inspector: ReactNode }) {
  return (
    <div className="app-detail">
      <div className="app-detail-main app-detail-stack">{children}</div>
      <aside className="app-detail-inspector">{inspector}</aside>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="app-detail-row os-type-body-small">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CenteredMessage({ children }: { children: ReactNode }) {
  return <div className="app-centered os-type-body">{children}</div>;
}
