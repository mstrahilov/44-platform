'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel } from '@/components/Ui';

export default function CreatorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreator() {
      const { data } = await supabase
        .from('creators')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      setCreator((data as Creator | null) ?? {
        id: 'fallback-creator-a',
        profile_id: null,
        slug,
        name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        bio: 'Creator profile, posts, products, services, resources, and community activity will live here.',
        creator_type: 'Creator',
        hero_url: null,
        avatar_url: null,
        is_published: true,
      });
      setLoading(false);
    }

    fetchCreator();
  }, [slug]);

  if (loading) return <CenteredMessage>Loading...</CenteredMessage>;
  if (!creator) return <CenteredMessage>Creator not found</CenteredMessage>;

  return (
    <DockedLayout side="right">
      <DockedContent>
        <section style={{ minHeight: 460, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(28,40,68,0.94), rgba(10,10,18,0.98)), radial-gradient(circle at 78% 20%, rgba(147,255,0,0.18), transparent 34%)' }}>
          {creator.hero_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.hero_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.38 }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.90), rgba(8,8,14,0.54) 58%, rgba(8,8,14,0.14))' }} />
          <div style={{ position: 'relative', zIndex: 1, minHeight: 460, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Link className="btn-ghost" href="/community/browse" style={{ marginBottom: 28 }}>Back to Community</Link>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10 }}>{creator.categories?.name ?? 'Creators'} · {creator.creator_type ?? 'Creator'}</div>
              <h1 style={{ maxWidth: 820, fontSize: 64, fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#fff', marginBottom: 14 }}>{creator.name}</h1>
              <div style={{ fontSize: 18, fontWeight: 650, color: 'rgba(255,255,255,0.62)' }}>Community profile</div>
            </div>
            <p style={{ maxWidth: 720, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75 }}>{creator.bio}</p>
          </div>
        </section>

        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)', borderRadius: 9999, padding: 5 }}>
            {['Feed', 'Releases', 'Services', 'Resources'].map((label, index) => (
              <button key={label} className={index === 0 ? 'btn-primary' : 'btn-ghost'} type="button" style={{ padding: '8px 16px', fontSize: 11 }}>{label}</button>
            ))}
          </div>
          <article className="post-card">
            <div className="post-card-title">Creator Feed</div>
            <div className="post-card-body">Posts, updates, project notes, and community discussion for this creator will appear here.</div>
          </article>
        </main>
      </DockedContent>

      <DockedPanel>
        <div className="detail-panel-stack">
          <div className="detail-panel-image">
            {creator.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt="" />
            )}
          </div>
          <div className="detail-panel-copy">
            <div className="detail-panel-title">{creator.name}</div>
            <div className="detail-panel-subtitle">{creator.creator_type ?? 'Creator Profile'}</div>
            <div className="detail-panel-description">{creator.bio ?? 'Creator bio will live here.'}</div>
          </div>
          <div className="detail-panel-actions">
            <button className="btn-primary" type="button">Follow</button>
            <button className="btn-ghost" type="button">Message</button>
            <Link className="btn-ghost" href="/community/browse">Browse Community</Link>
          </div>
          <div className="divider" />
          <div className="detail-panel-meta">
            <div className="detail-panel-section-title">Creator Details</div>
            <InfoLine label="Category" value={creator.categories?.name ?? 'Creators'} />
            <InfoLine label="Type" value={creator.creator_type ?? 'Creator'} />
            <InfoLine label="Profile" value={creator.slug ?? creator.name} />
            <InfoLine label="Status" value={creator.is_published ? 'Published' : 'Hidden'} />
          </div>
        </div>
      </DockedPanel>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.38)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 750, color: 'rgba(255,255,255,0.76)', textAlign: 'right' }}>{value}</div>
    </div>
  );
}
