'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Resource } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { useTopbarBack } from '@/components/TopbarContext';
import { ArticleContent } from '@/components/ArticleContent';
import { SocialAvatar } from '@/components/Social';
import { estimateReadTime } from '@/lib/articles';
import { useAuth } from '@/lib/useAuth';
import { isMissingRelationError } from '@/lib/schemaCompat';

type SavedResourceState = {
  userId: string;
  resourceId: string;
  savedId: string;
};

export default function ResourcePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedState, setSavedState] = useState<SavedResourceState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

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
    if (!userId || !resource?.id) return;
    const activeUserId = userId;
    const resourceId = resource.id;
    let alive = true;

    async function checkSaved() {
      const { data, error } = await supabase
        .from('saved_resources')
        .select('id')
        .eq('user_id', activeUserId)
        .eq('resource_id', resourceId)
        .maybeSingle();

      if (!alive) return;
      if (isMissingRelationError(error)) {
        setSaveStatus('Saved resources are ready in the app. Run the library SQL to enable saved resources in Supabase.');
        return;
      }

      setSavedState({ userId: activeUserId, resourceId, savedId: (data as { id: string } | null)?.id ?? '' });
    }

    checkSaved();
    return () => { alive = false; };
  }, [resource?.id, userId]);

  const savedId = savedState && savedState.userId === userId && savedState.resourceId === resource?.id ? savedState.savedId : '';

  async function toggleSaved() {
    if (!resource || saving) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setSaveStatus('');

    if (savedId) {
      const { error } = await supabase
        .from('saved_resources')
        .delete()
        .eq('id', savedId)
        .eq('user_id', user.id);

      if (error) setSaveStatus(error.message);
      else {
        setSavedState({ userId: user.id, resourceId: resource.id, savedId: '' });
        setSaveStatus('Removed from saved resources.');
      }
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('saved_resources')
      .insert({ user_id: user.id, resource_id: resource.id })
      .select('id')
      .single();

    if (isMissingRelationError(error)) {
      setSaveStatus('Saved resources are ready in the app. Run the library SQL to enable saved resources in Supabase.');
    } else if (error) {
      setSaveStatus(error.message);
    } else {
      setSavedState({ userId: user.id, resourceId: resource.id, savedId: (data as { id: string }).id });
      setSaveStatus('Saved to resources.');
    }
    setSaving(false);
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
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '28px 0' }}>
          <button className="os-button os-button-primary os-button-compact" type="button" onClick={toggleSaved} disabled={saving}>
            {savedId ? 'Saved' : saving ? 'Saving...' : 'Save Resource'}
          </button>
          <Link href="/resources/collection" className="os-button os-button-secondary os-button-compact">
            View Saved
          </Link>
        </div>
        {saveStatus && <div className="dashboard-status">{saveStatus}</div>}

        <ArticleContent html={resource.long_description ?? resource.short_description ?? ''} />
      </article>
    </div>
  );
}
