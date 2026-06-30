'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/platform';
import { PageShell, DetailLayout, DetailRow, CenteredMessage } from '@/components/Ui';

export default function CreatorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Feed');

  useEffect(() => {
    async function fetchCreator() {
      const { data } = await supabase
        .from('creators')
        .select('*, categories(id, slug, name)')
        .eq('slug', slug)
        .maybeSingle();

      setCreator(data as Creator | null);
      setLoading(false);
    }

    fetchCreator();
  }, [slug]);

  if (loading) return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  if (!creator) return <PageShell><CenteredMessage>Creator not found</CenteredMessage></PageShell>;

  return (
    <PageShell>
      <Link className="os-button os-button-ghost os-button-compact" href="/community/browse" style={{ marginBottom: 'var(--os-space-5)', alignSelf: 'flex-start' }}>
        ← Back to Community
      </Link>

      <DetailLayout
        inspector={
          <>
            <div className="app-inspector-art app-inspector-art-circle">
              {creator.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar_url} alt={creator.name} />
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">{creator.categories?.name ?? 'Members'}</div>
              <div className="os-type-section-title">{creator.name}</div>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 'var(--os-space-1)' }}>
                {creator.creator_type ?? 'Creator Profile'}
              </div>
            </div>
            <div className="app-detail-actions">
              <button className="os-button os-button-primary" type="button">Follow</button>
              <button className="os-button os-button-secondary" type="button">Message</button>
            </div>
            <hr className="app-detail-divider" />
            <DetailRow label="Category" value={creator.categories?.name ?? 'Members'} />
            <DetailRow label="Type" value={creator.creator_type ?? 'Creator'} />
            <DetailRow label="Profile" value={creator.slug ?? creator.name} />
            <DetailRow label="Status" value={creator.is_published ? 'Published' : 'Hidden'} />
          </>
        }
      >
        <section className="app-detail-hero">
          {creator.hero_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.hero_url} alt={creator.name} />
          )}
        </section>

        <div>
          <div className="app-detail-eyebrow os-type-eyebrow">
            {creator.categories?.name ?? 'Creators'} · {creator.creator_type ?? 'Creator'}
          </div>
          <h1 className="app-detail-title os-type-page-title">{creator.name}</h1>
          <p className="app-detail-lede os-type-body">{creator.bio}</p>
        </div>

        <div className="app-tag-row">
          {['Feed', 'Releases', 'Services', 'Resources'].map(label => (
            <button
              key={label}
              type="button"
              className={label === tab ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
              onClick={() => setTab(label)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="app-panel">
          <div className="app-panel-title os-type-eyebrow">{tab}</div>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
            Posts, updates, project notes, and community discussion for this creator will appear here.
          </p>
        </div>
      </DetailLayout>
    </PageShell>
  );
}
