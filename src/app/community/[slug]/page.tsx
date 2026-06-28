'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/platform';
import { DockedContent, DockedLayout, InfoPanel as DetailInfoPanel } from '@/components/Ui';

export default function CreatorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

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

      <DetailInfoPanel
        imageUrl={creator.avatar_url}
        imageAlt={creator.name}
        imageCircle
        eyebrow={creator.categories?.name ?? 'Members'}
        title={creator.name}
        subtitle={creator.creator_type ?? 'Creator Profile'}
        description={creator.bio}
        status={creator.is_published ? 'Published' : 'Hidden'}
        actions={[
          { label: 'Follow', onClick: () => undefined },
          { label: 'Message', onClick: () => undefined, variant: 'ghost' },
          { label: 'Browse Community', href: '/community/browse', variant: 'ghost' },
        ]}
        details={[
          { label: 'Category', value: creator.categories?.name ?? 'Members' },
          { label: 'Type', value: creator.creator_type ?? 'Creator' },
          { label: 'Profile', value: creator.slug ?? creator.name },
          { label: 'Status', value: creator.is_published ? 'Published' : 'Hidden' },
        ]}
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
