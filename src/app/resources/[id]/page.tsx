'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { PageShell, DetailLayout, DetailRow, CenteredMessage } from '@/components/Ui';

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
        .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)');

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
      alert('Sign in first, then save this resource to your collection.');
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

  if (loading) return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  if (!resource) return <PageShell><CenteredMessage>Resource not found</CenteredMessage></PageShell>;

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/resources/browse" style={{ marginBottom: 'var(--os-space-5)', alignSelf: 'flex-start' }}>
        ← Back to Resources
      </Link>

      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art">
              {resource.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resource.cover_url} alt={resource.title} />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{resource.categories?.name ?? 'Resource'}</div>
              <div className="os-type-section-title">{resource.title}</div>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>
                by {resource.creators?.name ?? '44 Community'}
              </div>
            </div>
            <div className="app-detail-actions">
              <button className="os-button os-button-primary" onClick={saveResource} disabled={saved}>
                {saved ? 'Saved' : 'Save Resource'}
              </button>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Type" value={resource.resource_type} />
            <DetailRow label="Category" value={resource.categories?.name ?? 'Resource'} />
            <DetailRow label="Access" value="Free" />
            <DetailRow label="Status" value={resource.status === 'published' ? 'Published' : resource.status} />
            {resource.creators && (
              <>
                <hr className="app-detail-divider" />
                <Link className="os-button os-button-secondary os-button-compact" href={creatorHref(resource.creators)}>
                  View {resource.creators.name}
                </Link>
              </>
            )}
          </>
        }
      >
        <section className="app-detail-hero">
          {resource.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resource.cover_url} alt={resource.title} />
          )}
        </section>

        <div>
          <div className="app-detail-eyebrow os-type-eyebrow">{resource.categories?.name ?? resource.resource_type}</div>
          <h1 className="app-detail-title os-type-page-title">{resource.title}</h1>
          <p className="app-detail-lede os-type-body">by {resource.creators?.name ?? '44 Community'}</p>
        </div>

        <div className="app-panel">
          <div className="app-panel-title os-type-eyebrow">Resource</div>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
            {resource.body ?? resource.summary ?? 'Resource body will live here.'}
          </p>
        </div>
      </DetailLayout>
    </PageShell>
  );
}
