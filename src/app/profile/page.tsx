'use client';

import { useState } from 'react';

type CreatorTab = 'feed' | 'releases' | 'services' | 'activity';

const TABS: { id: CreatorTab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'releases', label: 'Releases' },
  { id: 'services', label: 'Services' },
  { id: 'activity', label: 'Activity' },
];

const RELEASES = [
  { title: 'Product A', creator: 'Creator A', meta: 'Album · 2026', price: 'Free' },
  { title: 'Product B', creator: 'Creator A', meta: 'Game · 2026', price: '$14.99' },
  { title: 'Product C', creator: 'Creator A', meta: 'Interactive · 2026', price: 'Free' },
  { title: 'Product D', creator: 'Creator A', meta: 'Sample Pack · 2026', price: '$9.99' },
  { title: 'Product E', creator: 'Creator A', meta: 'Book · 2026', price: '$12.99' },
  { title: 'Product F', creator: 'Creator A', meta: 'Tool · 2026', price: 'Free' },
  { title: 'Product G', creator: 'Creator A', meta: 'Apparel · 2026', price: '$24.99' },
  { title: 'Product H', creator: 'Creator A', meta: 'EP · 2026', price: '$7.99' },
];

const SERVICES = [
  {
    name: 'Music Production',
    desc: 'Full track production from concept to master-ready file. Built for artists who want a complete sonic world around an idea.',
    tags: ['Production', 'Arrangement', 'Mix Prep'],
    price: 'From $149',
    delivery: '5-7 day delivery',
  },
  {
    name: 'Graphic Design & Artwork',
    desc: 'Album covers, single artwork, EP layouts, and visual systems for release campaigns and creator identity.',
    tags: ['Album Art', 'Typography', 'Brand System'],
    price: 'From $89',
    delivery: '3-5 day delivery',
  },
  {
    name: 'Touch Designer Visuals',
    desc: 'Generative and reactive visual systems for releases, installations, live shows, and web-based experiences.',
    tags: ['Generative', 'Audio Reactive', 'Live Visuals'],
    price: 'From $249',
    delivery: '7 day delivery',
  },
  {
    name: 'Session Guitar',
    desc: 'Clean, distorted, or textural guitar takes delivered as dry and wet stems for production-ready sessions.',
    tags: ['Guitar', 'Stems', 'Session Work'],
    price: 'From $79',
    delivery: '3 day delivery',
  },
];

const POSTS = [
  {
    time: '3 days ago',
    type: 'Release Note',
    title: 'Post A',
    body: 'Generic creator feed post for testing the creator profile layout.',
    attached: { title: 'Product A', sub: 'Product · Now on 44' },
    tags: ['Album', 'Electronic', 'Testing'],
  },
  {
    time: '2 weeks ago',
    type: 'Process',
    title: 'Post B',
    body: 'Generic process note for testing creator updates without using real creator names.',
    attached: null,
    tags: ['Process', 'Visuals', 'Testing'],
  },
];

const ACTIVITY = [
  { text: 'Published Product A.', time: '3 days ago' },
  { text: 'Posted a process note.', time: '2 weeks ago' },
  { text: 'Opened service availability.', time: 'This month' },
  { text: 'Published Product B.', time: 'Last month' },
];

const LINKS = [
  { label: 'creator-a.44.io' },
  { label: 'YouTube' },
  { label: 'Instagram · @creatora' },
  { label: 'SoundCloud · Creator A' },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<CreatorTab>('feed');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <section style={{ width: '100%', height: 330, maxWidth: 1440, margin: '0 auto', position: 'relative', overflow: 'hidden', flexShrink: 0, borderRadius: 28, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 18%, rgba(147,255,0,0.20), transparent 26%), radial-gradient(circle at 78% 26%, rgba(110,140,255,0.24), transparent 30%), linear-gradient(135deg, rgba(20,28,64,0.96) 0%, rgba(30,18,48,0.94) 48%, rgba(8,10,18,1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,18,0) 0%, rgba(10,10,18,0.08) 46%, #0A0A12 100%)' }} />
      </section>

      <section style={{ maxWidth: 1440, margin: '-54px auto 28px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 18 }}>
        <div style={{ width: 108, height: 108, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '4px solid #0A0A12', boxShadow: '0 14px 38px rgba(0,0,0,0.45)' }} />
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Creator A</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 9999, background: 'rgba(147,255,0,0.10)', border: '1px solid rgba(147,255,0,0.24)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93FF00' }}>Verified</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 10, flexShrink: 0 }}>
          <button style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: 9999, padding: '10px 24px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Follow</button>
          <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9999, padding: '10px 24px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.62)', cursor: 'pointer' }}>Message</button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18, maxWidth: 1440, margin: '0 auto' }}>
        <main style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)', borderRadius: 9999, padding: 5, marginBottom: 18 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ border: '1px solid transparent', background: activeTab === tab.id ? 'rgba(255,255,255,0.13)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.36)', borderColor: activeTab === tab.id ? 'rgba(255,255,255,0.18)' : 'transparent', borderRadius: 9999, padding: '9px 18px', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'feed' && (
            <SectionStack>
              {POSTS.map(post => <PostCard key={post.title} {...post} />)}
            </SectionStack>
          )}

          {activeTab === 'releases' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
              {RELEASES.map(release => <ReleaseCard key={release.title} {...release} />)}
            </div>
          )}

          {activeTab === 'services' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              {SERVICES.map(service => <ServiceCard key={service.name} {...service} />)}
            </div>
          )}

          {activeTab === 'activity' && (
            <SectionStack>
              {ACTIVITY.map(item => (
                <div key={item.text} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.86)', marginBottom: 5 }}>{item.text}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.32)' }}>{item.time}</div>
                </div>
              ))}
            </SectionStack>
          )}
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SidePanel title="About">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.56)', lineHeight: 1.75 }}>
              Placeholder creator profile for testing products, services, posts, and resources. This copy can later become the creator bio from Supabase.
            </div>
          </SidePanel>

          <SidePanel title="Links">
            {LINKS.map(link => (
              <div key={link.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.62)' }}>{link.label}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.24)' }}>→</span>
              </div>
            ))}
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}

function SectionStack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>;
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function ReleaseCard({ title, creator, meta, price }: { title: string; creator: string; meta: string; price: string }) {
  return (
    <article style={{ cursor: 'pointer' }}>
      <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>{creator}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>{meta}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: price === 'Free' ? '#93FF00' : '#fff' }}>{price}</span>
      </div>
    </article>
  );
}

function ServiceCard({ name, desc, tags, price, delivery }: { name: string; desc: string; tags: string[]; price: string; delivery: string }) {
  return (
    <article style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 18, padding: 22, minHeight: 236, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <div style={{ fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em', marginBottom: 9 }}>{name}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, marginBottom: 16, flex: 1 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {tags.map(tag => (
          <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9999, padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>{tag}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{price}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>{delivery}</div>
        </div>
        <button style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 9999, padding: '9px 18px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)', cursor: 'pointer' }}>Enquire</button>
      </div>
    </article>
  );
}

function PostCard({ time, type, title, body, attached, tags }: {
  time: string;
  type: string;
  title: string;
  body: string;
  attached: { title: string; sub: string } | null;
  tags: string[];
}) {
  return (
    <article style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 18, padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>Creator A</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{time}</div>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.42)' }}>{type}</div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 750, color: '#fff', marginBottom: 8, lineHeight: 1.28, letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, marginBottom: 16 }}>{body}</div>
      {attached && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.84)' }}>{attached.title}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{attached.sub}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {tags.map(tag => (
          <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9999, padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)' }}>{tag}</span>
        ))}
      </div>
    </article>
  );
}
