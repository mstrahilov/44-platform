'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { DockedContent, DockedLayout, InfoPanel as DetailInfoPanel } from '@/components/Ui';

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

      setResource(data as Resource | null);
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

    if (user && resource) {
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

      <DetailInfoPanel
        imageUrl={resource.cover_url}
        imageAlt={resource.title}
        eyebrow={resource.categories?.name ?? 'Resource'}
        title={resource.title}
        subtitle={`by ${resource.creators?.name ?? '44 Community'}`}
        description={resource.summary ?? resource.body}
        status="Free"
        actions={[
          { label: saved ? 'Saved' : 'Save Resource', onClick: saveResource, disabled: saved },
        ]}
        details={[
          { label: 'Type', value: resource.resource_type },
          { label: 'Category', value: resource.categories?.name ?? 'Resource' },
          { label: 'Access', value: 'Free' },
          { label: 'Status', value: resource.status === 'published' ? 'Published' : resource.status },
        ]}
        creator={resource.creators ? {
          name: resource.creators.name,
          avatarUrl: resource.creators.avatar_url,
          href: creatorHref(resource.creators),
        } : undefined}
      />
    </DockedLayout>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
  );
}
