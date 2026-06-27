import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Service, Resource, CommunityPost } from '@/lib/platform';
import { formatServicePrice, serviceHref } from '@/lib/platform';

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

export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass-panel ${className}`}>{children}</div>;
}

export function FilterSidebar({ children }: { children: ReactNode }) {
  return <aside className="filter-sidebar">{children}</aside>;
}

export function SurfaceBar({ children }: { children: ReactNode }) {
  return <div className="surface-bar">{children}</div>;
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link className="service-card" href={serviceHref(service)}>
      <div className="chip">{service.categories?.name ?? 'Service'}</div>
      <div className="service-card-title">{service.title}</div>
      <div className="service-card-creator">by {service.creators?.name ?? '44 Creator'}</div>
      <div className="service-card-description">{service.description}</div>
      <div className="service-card-footer">
        <div>
          <div className="service-card-price">{formatServicePrice(service)}</div>
          <div className="service-card-meta">{service.delivery_estimate}</div>
        </div>
        <div className="card-open-label">Open</div>
      </div>
    </Link>
  );
}

export function ResourceCard({
  resource,
  saved,
  onSave,
}: {
  resource: Resource;
  saved?: boolean;
  onSave?: (resource: Resource) => void;
}) {
  return (
    <article className="resource-card">
      <div className="chip">{resource.categories?.name ?? resource.resource_type}</div>
      <div className="resource-card-title">{resource.title}</div>
      <div className="resource-card-creator">by {resource.creators?.name ?? '44 Community'}</div>
      <div className="resource-card-description">{resource.summary}</div>
      <div className="resource-card-footer">
        {onSave && <button className="btn-primary" onClick={() => onSave(resource)}>{saved ? 'Saved' : 'Save Resource'}</button>}
        <div className="card-open-label">Read</div>
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
