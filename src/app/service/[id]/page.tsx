'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Service } from '@/lib/platform';
import { creatorHref, formatServicePrice } from '@/lib/platform';
import { PageShell, DetailLayout, DetailRow, CenteredMessage } from '@/components/Ui';

export default function ServicePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchService() {
      const { data } = await supabase
        .from('services')
        .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
        .eq('slug', id)
        .maybeSingle();

      setService(data as Service | null);
      setLoading(false);
    }

    fetchService();
  }, [id]);

  async function submitRequest() {
    if (!service) return;

    if (!user) {
      alert('Sign in first, then send this service request.');
      return;
    }

    const { error } = await supabase
      .from('service_requests')
      .insert({ user_id: user.id, service_id: service.id, message: null, status: 'inquiry' });

    if (error) {
      alert(error.message);
      return;
    }

    setRequested(true);
  }

  if (loading) return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  if (!service) return <PageShell><CenteredMessage>Service not found</CenteredMessage></PageShell>;

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/services/browse" style={{ marginBottom: 'var(--os-space-5)', alignSelf: 'flex-start' }}>
        ← Back to Services
      </Link>

      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art">
              {service.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.cover_url} alt={service.title} />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{service.categories?.name ?? 'Service'}</div>
              <div className="os-type-section-title">{service.title}</div>
              <div className="app-card-price os-type-card-title" style={{ marginTop: 'var(--os-space-2)' }}>{formatServicePrice(service)}</div>
            </div>
            <div className="app-detail-actions">
              <button className="os-button os-button-primary" onClick={submitRequest} disabled={requested}>
                {requested ? 'Request Sent' : 'Send Request'}
              </button>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Category" value={service.categories?.name ?? 'Service'} />
            <DetailRow label="Type" value={service.service_type ?? service.title} />
            <DetailRow label="Provider" value={service.creators?.name ?? '44 Creator'} />
            <DetailRow label="Timeline" value={service.delivery_estimate ?? 'Project-based'} />
            <DetailRow label="Status" value={service.status === 'published' ? 'Published' : service.status} />
            {service.creators && (
              <>
                <hr className="app-detail-divider" />
                <Link className="os-button os-button-secondary os-button-compact" href={creatorHref(service.creators)}>
                  View {service.creators.name}
                </Link>
              </>
            )}
          </>
        }
      >
        <section className="app-detail-hero">
          {service.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.cover_url} alt={service.title} />
          )}
        </section>

        <div>
          <div className="app-detail-eyebrow os-type-eyebrow">
            {service.categories?.name ?? 'Service'} · {service.service_type ?? service.title}
          </div>
          <h1 className="app-detail-title os-type-page-title">{service.title}</h1>
          <p className="app-detail-lede os-type-body">{service.description}</p>
        </div>

        <div className="app-panel">
          <div className="app-panel-title os-type-eyebrow">How It Works</div>
          <DetailRow label="Type" value={service.service_type ?? service.title} />
          <DetailRow label="Starting at" value={formatServicePrice(service)} />
          <DetailRow label="Timeline" value={service.delivery_estimate ?? 'Project-based'} />
          <DetailRow label="Status" value="Inquiry first" />
        </div>

        <div className="app-panel">
          <div className="app-panel-title os-type-eyebrow">Next Step</div>
          <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
            Send a short note about what you need. Checkout, milestones, files, and project
            management can be layered in later.
          </p>
        </div>
      </DetailLayout>
    </PageShell>
  );
}
