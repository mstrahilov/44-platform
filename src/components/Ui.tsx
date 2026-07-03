import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Service, Resource, CommunityPost } from '@/lib/platform';
import { communityThreadHref, resourceHref, serviceHref } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProductCard({ product, owned: _owned }: { product: Product; owned?: boolean }) {
  const href = `/product/${product.slug || product.id}`;
  const image = product.cover_url || product.hero_url;
  const shape = getProductTileShape(product);
  const subtitle = getProductTileSubtitle(product);
  return (
    <Link href={href} className="product-tile">
      <div className={`product-tile-art product-tile-art-${shape}`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        )}
      </div>
      <div className="product-tile-info">
        <div className="product-tile-title">{product.title}</div>
        <div className="product-tile-subtitle">{subtitle}</div>
      </div>
    </Link>
  );
}

function getProductTileShape(product: Product): 'square' | 'portrait' | 'book' | 'landscape' {
  const category = (product.category || '').toLowerCase();
  if (category === 'books') return 'book';
  if (category === 'assets') return 'landscape';
  if (category === 'apparel' || category === 'merch' || category === 'games') return 'portrait';
  return 'square'; // music (and any unknown category)
}

// Merch, apparel, assets → price. Music, games, books → creator/author.
function getProductTileSubtitle(product: Product): string {
  const category = (product.category || '').toLowerCase();
  if (category === 'apparel' || category === 'merch' || category === 'assets') {
    return formatProductPrice(product);
  }
  return product.creator || '44 Creator';
}

export function ServiceCard({ service }: { service: Service }) {
  const creator = service.creators?.name || '44 Creator';
  return (
    <Link className="product-tile" href={serviceHref(service)}>
      <div className="product-tile-art product-tile-art-square">
        {service.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.cover_url} alt="" />
        )}
      </div>
      <div className="product-tile-info">
        <div className="product-tile-title">{service.title}</div>
        <div className="product-tile-subtitle">{creator}</div>
      </div>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ResourceCard({
  resource,
  saved: _saved,
  onSave: _onSave,
}: {
  resource: Resource;
  saved?: boolean;
  onSave?: (resource: Resource) => void;
}) {
  const creator = resource.creators?.name || '44 Community';
  return (
    <Link className="product-tile" href={resourceHref(resource)}>
      <div className="product-tile-art product-tile-art-square">
        {resource.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resource.cover_url} alt="" />
        )}
      </div>
      <div className="product-tile-info">
        <div className="product-tile-title">{resource.title}</div>
        <div className="product-tile-subtitle">{creator}</div>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <Link href={communityThreadHref(post)} className="app-card">
      <div className="app-card-body">
        <span className="os-pill os-type-pill app-card-chip">{post.categories?.name ?? post.post_type}</span>
        <div className="app-card-title os-type-card-title">{post.title}</div>
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
  const meta = post.categories?.name ?? post.post_type ?? 'Discussion';

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
        <div className="os-type-section-title" style={{ marginBottom: 8, fontSize: 'clamp(1.1rem, 1.2vw + 0.8rem, 1.7rem)' }}>{post.title}</div>
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
  copy,
  actions,
}: {
  title: string;
  copy?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-copy">
        <h1 className="os-type-display">{title}</h1>
        {copy && <p className="os-type-body">{copy}</p>}
      </div>
      {actions}
    </header>
  );
}

export function HubSection({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="app-section">
      <div className="hub-section-head">
        <h2 className="hub-section-title">{title}</h2>
        {href && <Link href={href} className="os-button os-button-primary">View All</Link>}
      </div>
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
