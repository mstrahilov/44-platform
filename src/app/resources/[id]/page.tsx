'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
import { creatorHref, FALLBACK_RESOURCES } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel } from '@/components/Ui';

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResource() {
      const resourceQuery = supabase
        .from('resources')
        .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)');

      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ? resourceQuery.eq('id', id)
        : resourceQuery.eq('slug', id)
      ).maybeSingle();

      const fallback = FALLBACK_RESOURCES.find(item => item.id === id || item.slug === id) ?? null;
      setResource((data as Resource | null) ?? fallback);
      setLoading(false);
    }

    fetchResource();
  }, [id]);

  useEffect(() => {
    async function fetchSaved(userId: string, resourceId: string) {
      const { data } = await supabase
        .from('saved_resources')
        .select('resource_id')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .maybeSingle();

      setSaved(Boolean(data));
    }

    if (user && resource && !resource.id.startsWith('fallback-')) {
      fetchSaved(user.id, resource.id);
    } else {
      Promise.resolve().then(() => setSaved(false));
    }
  }, [resource, user]);

  async function saveResource() {
    if (!resource) return;
    if (!user) {
      alert('Sign in first, then save this resource to your library.');
      return;
    }
    if (resource.id.startsWith('fallback-')) {
      alert('Run the platform architecture SQL first, then saved resources can be stored.');
      return;
    }

    const { error } = await supabase
      .from('saved_resources')
      .upsert({ user_id: user.id, resource_id: resource.id }, { onConflict: 'user_id,resource_id' });

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  }

  if (loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (!resource) return <CenteredMessage>Resource not found</CenteredMessage>;

  return (
    <DockedLayout side="right">
      <DockedContent>
        <section style={{ minHeight: 460, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(40,54,74,0.94), rgba(10,10,18,0.98)), radial-gradient(circle at 75% 20%, rgba(147,255,0,0.18), transparent 34%)' }}>
          {resource.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resource.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.90), rgba(8,8,14,0.54) 58%, rgba(8,8,14,0.14))' }} />
          <div style={{ position: 'relative', zIndex: 1, minHeight: 460, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Link className="btn-ghost" href="/resources/browse" style={{ marginBottom: 28 }}>Back to Resources</Link>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10 }}>{resource.categories?.name ?? resource.resource_type}</div>
              <h1 style={{ maxWidth: 820, fontSize: 64, fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#fff', marginBottom: 14 }}>{resource.title}</h1>
              <div style={{ fontSize: 18, fontWeight: 650, color: 'rgba(255,255,255,0.62)' }}>by {resource.creators?.name ?? '44 Community'}</div>
            </div>
            <p style={{ maxWidth: 720, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75 }}>{resource.summary ?? resource.body}</p>
          </div>
        </section>

        <section className="library-panel">
          <div className="surface-eyebrow">Resource</div>
          <div className="library-muted-copy">{resource.body ?? resource.summary ?? 'Resource body will live here.'}</div>
        </section>
      </DockedContent>

      <DockedPanel>
        <div className="detail-panel-stack">
          <div className="detail-panel-image">
            {resource.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resource.cover_url} alt="" />
            )}
          </div>
          <div className="detail-panel-copy">
            <div className="detail-panel-title">{resource.title}</div>
            <div className="detail-panel-subtitle">by {resource.creators?.name ?? '44 Community'}</div>
            <div className="detail-panel-description">{resource.summary ?? resource.body ?? 'Resource body will live here.'}</div>
          </div>
          <div className="detail-panel-actions">
            <button className="btn-primary" onClick={saveResource} disabled={saved} style={{ opacity: saved ? 0.72 : 1 }}>{saved ? 'Saved' : 'Save Resource'}</button>
            <Link className="btn-ghost" href={creatorHref(resource.creators)}>View Creator</Link>
          </div>
          <div className="divider" />
          <div className="detail-panel-meta">
            <div className="detail-panel-section-title">Resource Details</div>
            <InfoLine label="Type" value={resource.resource_type} />
            <InfoLine label="Category" value={resource.categories?.name ?? 'Resource'} />
            <InfoLine label="Access" value="Free" />
            <InfoLine label="Status" value={resource.status === 'published' ? 'Published' : resource.status} />
          </div>
        </div>
      </DockedPanel>
    </DockedLayout>
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
