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
import { ArticleContent } from '@/components/ArticleContent';
import { SocialAvatar } from '@/components/Social';
import { estimateReadTime } from '@/lib/articles';

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
    if (!user) { alert('Sign in first, then save this resource to your library.'); return; }
    const { error } = await supabase.from('saved_resources').upsert({ user_id: user.id, resource_id: resource.id }, { onConflict: 'user_id,resource_id' });
    if (error) { alert(error.message); return; }
    setSaved(true);
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!resource) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Resource not found</div>;

  const authorName = resource.creators?.name ?? '44 Community';
  const readTime = estimateReadTime(resource.long_description);
  const category = resource.categories?.name ?? resource.resource_type ?? 'Resource';

  return (
    <div className="view-detail-single">
      <article className="article-shell">
        {resource.cover_url && (
          <div className="article-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resource.cover_url} alt={resource.title} />
          </div>
        )}

        <div className="article-eyebrow">{category}</div>
        <h1 className="article-title">{resource.title}</h1>

        <div className="article-byline">
          <SocialAvatar profile={resource.creators ? { id: resource.creators.id, display_name: authorName, username: null, slug: resource.creators.slug ?? null, avatar_url: resource.creators.avatar_url ?? null, role: null, creator_type: null } : null} />
          {resource.creators ? (
            <Link href={creatorHref(resource.creators)} className="article-byline-name" style={{ textDecoration: 'none' }}>
              {authorName}
            </Link>
          ) : (
            <span className="article-byline-name">{authorName}</span>
          )}
          {readTime > 0 && (
            <>
              <span className="article-byline-dot" aria-hidden="true" />
              <span>{readTime} min read</span>
            </>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="os-button os-button-secondary os-button-compact"
              onClick={saveResource}
              disabled={saved}
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          </span>
        </div>

        <ArticleContent html={resource.long_description ?? resource.short_description ?? ''} />
      </article>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 4px', width: '100%' }}>
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
    </div>
  );
}
