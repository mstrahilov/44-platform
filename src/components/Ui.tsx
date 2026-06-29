import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Service, Resource, CommunityPost } from '@/lib/platform';
import { formatServicePrice, resourceHref, serviceHref } from '@/lib/platform';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-scroll">
      <div className="page-inner">{children}</div>
    </div>
  );
}

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      {href && <Link className="section-link" href={href}>View All {'->'}</Link>}
    </div>
  );
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

export function FilterSidebar({ children }: { children: ReactNode }) {
  return <aside className="filter-sidebar">{children}</aside>;
}

export function SurfaceBar({ children }: { children: ReactNode }) {
  return <div className="surface-bar">{children}</div>;
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

export interface BrowsePanelItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

export function BrowsePanel({
  title,
  totalCount,
  allLabel = 'All Items',
  activeId,
  categories,
  onSelect,
  onClear,
}: {
  title: string;
  totalCount: number;
  allLabel?: string;
  activeId: string;
  categories: BrowsePanelItem[];
  onSelect: (id: string) => void;
  onClear?: () => void;
}) {
  return (
    <DockedPanel>
      <div className="browse-panel-title">{title}</div>
      <div className="divider" />

      <BrowsePanelButton
        active={activeId === 'all'}
        icon="grid"
        count={totalCount}
        onClick={() => onSelect('all')}
      >
        {allLabel}
      </BrowsePanelButton>

      <div className="browse-panel-group">
        <div className="browse-panel-section-title">Categories</div>
        <div className="browse-panel-list">
          {categories.map(category => (
            <BrowsePanelButton
              key={category.id}
              active={activeId === category.id}
              icon={category.icon ?? category.id}
              count={category.count}
              onClick={() => onSelect(category.id)}
            >
              {category.label}
            </BrowsePanelButton>
          ))}
        </div>
      </div>
    </DockedPanel>
  );
}

function BrowsePanelButton({
  active,
  icon,
  count,
  onClick,
  children,
}: {
  active: boolean;
  icon?: string;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={active ? 'browse-filter-button browse-filter-button-active' : 'browse-filter-button'}
      type="button"
    >
      <span className="browse-filter-left">
        <span className="browse-filter-icon">
        <img
          src={iconForBrowse(icon)}
          alt=""
          aria-hidden="true"
        />
      </span>
        <span className="browse-filter-label">{children}</span>
      </span>
      {typeof count === 'number' && <span className="browse-filter-count">{count.toLocaleString()}</span>}
    </button>
  );
}

function iconForBrowse(icon?: string) {
  return `/icons/browse/${icon ?? 'grid'}.svg`;
}

export interface InfoPanelDetail {
  label: string;
  value: ReactNode;
}

export interface InfoPanelAction {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export interface InfoPanelCreator {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  href?: string;
}

export function InfoPanel({
  imageUrl,
  imageAlt = '',
  imageCircle = false,
  eyebrow,
  title,
  subtitle,
  description,
  price,
  priceTone,
  status,
  tags = [],
  actions = [],
  details = [],
  creator,
  children,
}: {
  imageUrl?: string | null;
  imageAlt?: string;
  imageCircle?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string | null;
  price?: string;
  priceTone?: 'free' | 'default';
  status?: string;
  tags?: string[];
  actions?: InfoPanelAction[];
  details?: InfoPanelDetail[];
  creator?: InfoPanelCreator;
  children?: ReactNode;
}) {
  return (
    <DockedPanel>
      <div className="info-panel-stack">
        <div className="info-panel-head">
          <div className={imageCircle ? 'info-panel-image info-panel-image-circle' : 'info-panel-image'}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={imageAlt} />
            )}
          </div>
          <div className="info-panel-heading">
            {eyebrow && <div className="info-panel-eyebrow">{eyebrow}</div>}
            <div className="info-panel-title">{title}</div>
            {subtitle && <div className="info-panel-subtitle">{subtitle}</div>}
          </div>
          {price && <div className={priceTone === 'free' ? 'info-panel-price info-panel-price-free' : 'info-panel-price'}>{price}</div>}
          {!price && status && <div className="info-panel-status">{status}</div>}
        </div>

        {children}

        {actions.length > 0 && (
          <div className="info-panel-actions">
            {actions.map(action => action.href ? (
              <Link
                key={`${action.label}-${action.href}`}
                className={action.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}
                href={action.href}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                className={action.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}
                onClick={action.onClick}
                disabled={action.disabled}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <>
            <div className="divider" />
            <div>
              <div className="info-panel-section-title">Tags</div>
              <div className="info-panel-tags">
                {tags.map(tag => <span className="info-panel-tag" key={tag}>{tag}</span>)}
              </div>
            </div>
          </>
        )}

        {details.length > 0 && (
          <>
            <div className="divider" />
            <div className="info-panel-meta">
              <div className="info-panel-section-title">Details</div>
              {details.map(detail => <InfoPanelLine key={detail.label} label={detail.label} value={detail.value} />)}
            </div>
          </>
        )}

        {creator && (
          <>
            <div className="divider" />
            <div className="info-panel-creator">
              <div className="info-panel-section-title">Creator</div>
              <div className="info-panel-creator-row">
                <span className="info-panel-creator-avatar">
                  {creator.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creator.avatarUrl} alt="" />
                  )}
                </span>
                <span>
                  <span className="info-panel-creator-name">{creator.name}</span>
                  {creator.subtitle && <span className="info-panel-creator-subtitle">{creator.subtitle}</span>}
                </span>
              </div>
              {creator.href && <Link className="btn-ghost" href={creator.href}>View Profile</Link>}
            </div>
          </>
        )}
      </div>
    </DockedPanel>
  );
}

function InfoPanelLine({ label, value }: InfoPanelDetail) {
  return (
    <div className="info-panel-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

export function ServiceCard({ service, variant = 'wide' }: { service: Service; variant?: 'wide' | 'compact' }) {
  return (
    <Link className={`service-card service-card-${variant}`} href={serviceHref(service)}>
      <div className="service-card-bg">
        {service.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.cover_url} alt="" />
        )}
      </div>
      <span className="card-heart" aria-hidden="true">♡</span>
      <div className="service-card-chip">{service.categories?.name ?? 'Service'}</div>
      <div className="service-card-title">{service.title}</div>
      <div className="service-card-description">{service.description}</div>
      <div className="service-card-footer">
        <div>
          <div className="service-card-price">{formatServicePrice(service)}</div>
          <div className="service-card-meta">{service.delivery_estimate}</div>
        </div>
        <div className="btn-ghost service-card-button">Learn More</div>
      </div>
    </Link>
  );
}

export function ResourceCard({
  resource,
  saved,
  onSave,
  variant = 'wide',
}: {
  resource: Resource;
  saved?: boolean;
  onSave?: (resource: Resource) => void;
  variant?: 'wide' | 'compact';
}) {
  return (
    <article className={`resource-card resource-card-${variant}`}>
      <div className="resource-card-bg">
        {resource.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resource.cover_url} alt="" />
        )}
      </div>
      <span className="card-heart" aria-hidden="true">♡</span>
      <div className="resource-card-title">{resource.title}</div>
      <div className="resource-card-creator">by {resource.creators?.name ?? '44 Community'}</div>
      <div className="resource-card-description">{resource.summary}</div>
      <div className="resource-card-footer">
        {onSave && <button className="btn-ghost resource-card-action" onClick={() => onSave(resource)}>{saved ? 'Saved' : 'Save Resource'}</button>}
        <Link className="card-open-label" href={resourceHref(resource)}>Read</Link>
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article className="post-card">
      <div className="chip">{post.categories?.name ?? post.post_type}</div>
      <div className="post-card-title">{post.title}</div>
      <div className="post-card-creator">by {post.creators?.name ?? '44 Community'}</div>
      <div className="post-card-body">{post.body}</div>
    </article>
  );
}
