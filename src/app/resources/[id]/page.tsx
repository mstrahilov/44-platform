'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { useTopbarBack } from '@/components/TopbarContext';
import { ItemCommunitySection } from '@/components/ItemCommunitySection';

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useTopbarBack({ href: '/resources', label: 'Resources' });

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
      const { data } = await supabase.from('saved_resources').select('resource_id').eq('user_id', userId).eq('resource_id', resourceId).maybeSingle();
      setSaved(Boolean(data));
    }
    if (user && resource) fetchSaved(user.id, resource.id);
    else Promise.resolve().then(() => setSaved(false));
  }, [resource, user]);

  async function saveResource() {
    if (!resource) return;
    if (!user) { alert('Sign in first, then save this resource to your collection.'); return; }
    const { error } = await supabase.from('saved_resources').upsert({ user_id: user.id, resource_id: resource.id }, { onConflict: 'user_id,resource_id' });
    if (error) { alert(error.message); return; }
    setSaved(true);
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!resource) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Resource not found</div>;

  const description = resource.long_description ?? resource.short_description ?? '';

  return (
    <div className="view-detail-single">

      {/* Album-style header */}
      <div
        className={resource.cover_url ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={resource.cover_url ? { backgroundImage: `url(${resource.cover_url})` } as React.CSSProperties : undefined}
      >
        <div className="view-album-cover">
          {resource.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resource.cover_url} alt={resource.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow">{resource.categories?.name ?? resource.resource_type}</div>
          <h1 className="view-album-title">{resource.title}</h1>
          <div className="view-album-meta">
            <span style={{ fontWeight: 700 }}>{resource.creators?.name ?? '44 Community'}</span>
            <span className="view-album-meta-sep" />
            <span>Free</span>
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" onClick={saveResource} disabled={saved}>
              {saved ? 'Saved' : 'Save Resource'}
            </button>
            {resource.creators && (
              <Link className="os-button os-button-secondary" href={creatorHref(resource.creators)}>
                View Profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {description.length > 40 && (
        <div className="view-section">
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', lineHeight: 1.72, maxWidth: 720, fontSize: 16 }}>
            {description}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="view-section">
        <h2 className="view-section-title">Details</h2>
        <div>
          <div className="view-row">
            <span className="view-row-label">Type</span>
            <span className="view-row-value">{resource.resource_type}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Category</span>
            <span className="view-row-value">{resource.categories?.name ?? 'Resource'}</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Access</span>
            <span className="view-row-value">Free</span>
          </div>
          <div className="view-row">
            <span className="view-row-label">Author</span>
            <span className="view-row-value">{resource.creators?.name ?? '44 Community'}</span>
          </div>
        </div>
      </div>

      <ItemCommunitySection
        subjectType="resource"
        subjectId={resource.id}
        subjectLabel={resource.title}
        categorySlugs={['questions']}
        sectionTitle="Questions"
        actionLabel="Ask a Question"
        titlePlaceholder="What do you want to know?"
        composerPlaceholder="Add the details of your question…"
        emptyMessage="No questions yet — be the first to ask."
      />
    </div>
  );
}
