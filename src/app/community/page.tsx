'use client';

import { useState } from 'react';

/* ── static data ── */
const FEED_TABS = ['Feed', 'Dev Logs', 'Showcase', 'Discussions', 'Events'];

const POSTS = [
  {
    author: 'Ølsten', time: '2 hours ago', type: 'Dev Log', typeClass: 'devlog', pinned: true,
    title: 'ANTHØLOGY v1.0 is live. 200+ tracks across 15 years. Here\'s what changed.',
    body: 'Spent the last few months rebuilding the entire catalog from the ground up. New logo, new masters, new video pipeline for every track. The old system had no ceiling — you could feel it. The new one doesn\'t. All tracks now live under the ANTHØLOGY playlist on YouTube. Full patch notes below.',
    attached: { title: 'ANTHØLOGY', sub: 'Ølsten · 200+ tracks in library' },
    tags: ['Update', 'Music', 'Mastering'],
    likes: '847', comments: '132',
  },
  {
    author: 'Tellali', time: '5 hours ago', type: 'Showcase', typeClass: 'showcase', pinned: false,
    title: 'MUSES is out now on 44. Eight tracks. No filler.',
    body: 'Started this EP in a hotel room in October. Went through 14 versions of the tracklist. The final version has 8 tracks — every single one earned its place. MUSES drops exclusively on 44 first.',
    attached: { title: 'MUSES', sub: 'Tellali · EP · Now on 44' },
    tags: ['Music', 'EP', '44 Exclusive'],
    likes: '329', comments: '88',
  },
  {
    author: 'Elara Write', time: 'Yesterday', type: 'Discussion', typeClass: 'discuss', pinned: false,
    title: 'What does a fair creator split actually look like in 2026?',
    body: 'Steam takes 30%. Itch.io lets you set your own. 44 is building something new. I\'ve been thinking about this as someone who sells novels here — what split would make you stay on a platform long term? What would make you leave? Genuinely curious what other creators think.',
    attached: null,
    tags: ['Revenue Split', 'Creator Economy', 'Platform'],
    likes: '394', comments: '217',
  },
  {
    author: 'ToolsbyNox', time: '2 days ago', type: 'News', typeClass: 'news', pinned: false,
    title: 'SOMA just hit its first milestone. I need to say something.',
    body: 'Three years ago I was in a warehouse job building this game at 2am. I didn\'t tell anyone. I thought it was too weird, too niche. It hit its first milestone on 44 last night. I cried. That\'s it. That\'s the post. Thank you.',
    attached: { title: 'SOMA', sub: '44 CORPORATION · Game' },
    tags: ['Game Dev', 'Milestone'],
    likes: '4.8K', comments: '612',
  },
  {
    author: 'SoundForge', time: '3 days ago', type: 'Feedback Request', typeClass: 'feedback', pinned: false,
    title: 'Early listen: new ambient pack — tell me what\'s broken',
    body: 'Dropping a free preview of the new ambient pack for SOMA owners. 40 new patches across dark, textural, and generative. I want brutal feedback before the full release. What sounds wrong? What\'s missing? Be ruthless.',
    attached: null,
    tags: ['Music', 'Beta', 'Feedback'],
    likes: '342', comments: '94',
  },
];

const TRENDING = [
  { tag: '#CreatorEconomy',  count: '840 posts' },
  { tag: '#IndieGame',       count: '476 posts' },
  { tag: '#DevLog',          count: '388 posts' },
  { tag: '#NeonDrift',       count: '301 posts' },
  { tag: '#MusicProduction', count: '271 posts' },
  { tag: '#DigitalArt',      count: '254 posts' },
];

const TOP_CREATORS = [
  { rank: 1, name: 'Ølsten',      delta: '↑ 3', up: true  },
  { rank: 2, name: 'Tellali',     delta: '↑ 1', up: true  },
  { rank: 3, name: 'ToolsbyNox', delta: '↑ 8', up: true  },
  { rank: 4, name: 'SoundForge', delta: '—',   up: false },
  { rank: 5, name: 'Elara Write', delta: '↑ 2', up: true  },
];

const JUST_DROPPED = [
  { title: 'MUSES',                 creator: 'Tellali · EP'             },
  { title: 'ELSEWHERE MYTH VOL. 1', creator: '44 CORPORATION · Book'    },
  { title: 'GHOST',                 creator: 'Ølsten · Album'           },
];

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  devlog:   { background: 'rgba(100,140,255,0.12)', border: '1px solid rgba(100,140,255,0.22)', color: 'rgba(160,190,255,0.90)' },
  showcase: { background: 'rgba(160,100,255,0.12)', border: '1px solid rgba(160,100,255,0.22)', color: 'rgba(200,160,255,0.90)' },
  discuss:  { background: 'rgba(255,160,60,0.10)',  border: '1px solid rgba(255,160,60,0.20)',  color: 'rgba(255,190,100,0.90)' },
  news:     { background: 'rgba(255,255,100,0.08)', border: '1px solid rgba(255,255,100,0.16)', color: 'rgba(255,255,140,0.80)' },
  feedback: { background: 'rgba(60,200,180,0.10)',  border: '1px solid rgba(60,200,180,0.20)',  color: 'rgba(100,220,200,0.85)' },
};

/* ── page ── */
export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('Feed');

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 28px 28px', gap: 14 }}>

      {/* ── FEED ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minWidth: 0 }}>

        {/* tabs row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {FEED_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '7px 16px', fontSize: 11, fontWeight: activeTab === tab ? 600 : 500,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.38)',
                  cursor: 'pointer', borderRadius: 9999,
                  background: activeTab === tab ? 'rgba(255,255,255,0.10)' : 'transparent',
                  border: `1px solid ${activeTab === tab ? 'rgba(255,255,255,0.16)' : 'transparent'}`,
                  fontFamily: 'inherit',
                  transition: 'color 150ms ease, background 150ms ease, border-color 150ms ease',
                }}
              >{tab}</button>
            ))}
          </div>
          <button style={{
            background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(24px)', borderRadius: 9999,
            padding: '8px 18px', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, color: '#fff',
            cursor: 'pointer', letterSpacing: '0.05em',
          }}>+ New Post</button>
        </div>

        {/* feed scroll */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {POSTS.map((post, i) => (
            <PostCard key={i} {...post} />
          ))}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* community stats */}
        <SidePanel title="Community">
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>4,821</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', marginBottom: 10 }}>Members online now</div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, marginBottom: 4 }}>
            <div style={{ height: 3, background: '#93FF00', borderRadius: 9999, width: '72%' }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}>72% of today&apos;s peak</div>
        </SidePanel>

        {/* trending */}
        <SidePanel title="Trending Topics">
          {TRENDING.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: i < TRENDING.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{t.tag}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}>{t.count}</div>
            </div>
          ))}
        </SidePanel>

        {/* top creators */}
        <SidePanel title="Top Creators This Week">
          {TOP_CREATORS.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
              borderBottom: i < TOP_CREATORS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', width: 16, textAlign: 'center', flexShrink: 0 }}>{c.rank}</div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }} />
              <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{c.name}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.up ? '#93FF00' : 'rgba(255,255,255,0.25)' }}>{c.delta}</div>
            </div>
          ))}
        </SidePanel>

        {/* just dropped */}
        <SidePanel title="Just Dropped">
          {JUST_DROPPED.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
              borderBottom: i < JUST_DROPPED.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.33)', marginTop: 1 }}>{d.creator}</div>
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                background: 'rgba(147,255,0,0.12)', border: '1px solid rgba(147,255,0,0.22)',
                color: '#93FF00', borderRadius: 5, padding: '2px 6px', flexShrink: 0,
              }}>New</div>
            </div>
          ))}
        </SidePanel>

      </div>
    </div>
  );
}

/* ── sub-components ── */

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
      backdropFilter: 'blur(24px)', borderRadius: 16, padding: '16px 18px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function PostCard({ author, time, type, typeClass, pinned, title, body, attached, tags, likes, comments }: {
  author: string; time: string; type: string; typeClass: string; pinned: boolean;
  title: string; body: string; attached: { title: string; sub: string } | null;
  tags: string[]; likes: string; comments: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.09)'}`,
        backdropFilter: 'blur(24px)', borderRadius: 16, padding: '20px 22px',
        cursor: 'pointer', transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '50%' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{author}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>{time}</div>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 6, flexShrink: 0,
          ...TYPE_STYLES[typeClass],
        }}>{type}</div>
        {pinned && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>📌 Pinned</div>}
      </div>

      {/* title + body */}
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.7, marginBottom: 14 }}>{body}</div>

      {/* attached */}
      {attached && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{attached.title}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{attached.sub}</div>
          </div>
        </div>
      )}

      {/* tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {tags.map(tag => (
          <div key={tag} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 6, padding: '2px 8px',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
            color: 'rgba(255,255,255,0.35)',
          }}>{tag}</div>
        ))}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>♡ {likes}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>💬 {comments}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>🔖 Save</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}>Share →</div>
      </div>
    </div>
  );
}
