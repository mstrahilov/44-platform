'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Service } from '@/lib/platform';
import { creatorHref, formatServicePrice } from '@/lib/platform';
import { useTopbarBack } from '@/components/TopbarContext';
import { ItemCommunitySection } from '@/components/ItemCommunitySection';

export default function ServicePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);

  useTopbarBack({ href: '/services', label: 'Services' });

  useEffect(() => {
    async function fetchService() {
      const { data } = await supabase
        .from('services')
        .select('*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name)')
        .eq('slug', id)
        .maybeSingle();
      setService(data as Service | null);
      setLoading(false);
    }
    fetchService();
  }, [id]);

  async function submitRequest() {
    if (!service) return;
    if (!user) { alert('Sign in first, then send this service request.'); return; }
    const { error } = await supabase.from('service_requests').insert({ user_id: user.id, service_id: service.id, message: null, status: 'inquiry' });
    if (error) { alert(error.message); return; }
    setRequested(true);
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!service) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Service not found</div>;

  const hasCover = Boolean(service.cover_url);

  const description = service.long_description || service.short_description || '';

  return (
    <div className="view-detail-single">

      {/* Album-style header */}
      <div
        className={hasCover ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={hasCover ? { backgroundImage: `url(${service.cover_url})` } as React.CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {hasCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.cover_url!} alt={service.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow">{service.categories?.name ?? 'Service'}</div>
          <h1 className="view-album-title">{service.title}</h1>
          <div className="view-album-meta">
            {service.creators && <span className="view-album-meta-strong">{service.creators.name}</span>}
            <span className="view-album-meta-sep" />
            <span>{formatServicePrice(service)}</span>
            {service.delivery_estimate && (<><span className="view-album-meta-sep" /><span>{service.delivery_estimate}</span></>)}
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" onClick={submitRequest} disabled={requested}>
              {requested ? 'Request Sent' : 'Send Request'}
            </button>
            {service.creators && (
              <Link className="os-button os-button-secondary" href={creatorHref(service.creators)}>
                View {service.creators.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body view-description">
            {description}
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="view-section">
        <h2 className="view-section-title">How It Works</h2>
        <div>
          <div className="view-row">
            <span className="view-row-label">Type</span>
            <span className="view-row-value">{service.service_type ?? service.title}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Starting at</span>
            <span className="view-row-value">{formatServicePrice(service)}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Timeline</span>
            <span className="view-row-value">{service.delivery_estimate ?? 'Project-based'}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Engagement</span>
            <span className="view-row-value">Inquiry first</span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="view-section">
        <h2 className="view-section-title">Next Steps</h2>
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720 }}>
          Send a short note about what you need. Checkout, milestones, files, and project management can be layered in once the conversation starts.
        </p>
      </div>

      <ItemCommunitySection
        subjectType="service"
        subjectId={service.id}
        subjectLabel={service.title}
        categorySlugs={['reviews']}
        sectionTitle="Reviews"
        actionLabel="Post Review"
        titlePlaceholder={`Reviewing "${service.title}"`}
        composerPlaceholder="How was working with this creator?"
        emptyMessage="No reviews yet — be the first."
      />
    </div>
  );
}
