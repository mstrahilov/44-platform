'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Service } from '@/lib/platform';
import { creatorHref, formatServicePrice } from '@/lib/platform';
import { DockedContent, DockedLayout, InfoPanel as DetailInfoPanel } from '@/components/Ui';

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
        .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
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
      .insert({
        user_id: user.id,
        service_id: service.id,
        message: null,
        status: 'inquiry',
      });

    if (error) {
      alert(error.message);
      return;
    }

    setRequested(true);
  }

  if (loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (!service) return <CenteredMessage>Service not found</CenteredMessage>;

  return (
    <DockedLayout side="right">
      <DockedContent>
        <section style={{ minHeight: 460, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(28,42,66,0.94), rgba(10,10,18,0.98)), radial-gradient(circle at 75% 20%, rgba(147,255,0,0.22), transparent 34%)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.88), rgba(8,8,14,0.46) 58%, rgba(8,8,14,0.12))' }} />
          <div style={{ position: 'relative', zIndex: 1, minHeight: 460, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Link className="btn-ghost" href="/services/browse" style={{ marginBottom: 28 }}>Back to Services</Link>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10 }}>{service.categories?.name ?? 'Service'} · {service.service_type ?? service.title}</div>
              <h1 style={{ maxWidth: 820, fontSize: 64, fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#fff', marginBottom: 14 }}>{service.title}</h1>
              <div style={{ fontSize: 18, fontWeight: 650, color: 'rgba(255,255,255,0.62)' }}>Compare creator offerings and send an inquiry.</div>
            </div>
            <p style={{ maxWidth: 720, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75 }}>{service.description}</p>
          </div>
        </section>

        <section className="product-info-grid">
            <InfoPanel title="How It Works">
            <InfoLine label="Type" value={service.service_type ?? service.title} />
            <InfoLine label="Starting at" value={formatServicePrice(service)} />
            <InfoLine label="Timeline" value={service.delivery_estimate ?? 'Project-based'} />
            <InfoLine label="Status" value="Inquiry first" />
          </InfoPanel>
          <InfoPanel title="Next Step">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.52)', lineHeight: 1.7 }}>
              Send a short note about what you need. Checkout, milestones, files, and project management can be layered in later.
            </div>
          </InfoPanel>
        </section>
      </DockedContent>

      <DetailInfoPanel
        imageUrl={service.cover_url}
        imageAlt={service.title}
        eyebrow={service.categories?.name ?? 'Service'}
        title={service.title}
        subtitle={service.service_type ?? undefined}
        description={service.description}
        price={formatServicePrice(service)}
        actions={[
          { label: requested ? 'Request Sent' : 'Send Request', onClick: submitRequest },
        ]}
        details={[
          { label: 'Category', value: service.categories?.name ?? 'Service' },
          { label: 'Type', value: service.service_type ?? service.title },
          { label: 'Current provider', value: service.creators?.name ?? '44 Creator' },
          { label: 'Timeline', value: service.delivery_estimate ?? 'Project-based' },
          { label: 'Status', value: service.status === 'published' ? 'Published' : service.status },
        ]}
        creator={service.creators ? {
          name: service.creators.name,
          avatarUrl: service.creators.avatar_url,
          href: creatorHref(service.creators),
        } : undefined}
      />
    </DockedLayout>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 22, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.38)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 750, color: 'rgba(255,255,255,0.76)', textAlign: 'right' }}>{value}</div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
  );
}
