'use client';

import { useState } from 'react';

/* ── static data ── */
const STATS = [
  { value: '1.2K',  label: 'Followers'    },
  { value: '7',     label: 'Releases'      },
  { value: '4',     label: 'Services'      },
  { value: '14.2K', label: 'Downloads'     },
  { value: '92%',   label: 'Revenue Share' },
];

const RELEASES = [
  { title: 'the lvminary: exhibition 2', meta: '2025 · Album'            },
  { title: 'new namibian electronic.',   meta: '2025 · Album'            },
  { title: 'infinite.',                  meta: '2025 · Single'           },
  { title: 'addict.',                    meta: '2024 · Single'           },
  { title: 'divine.',                    meta: '2024 · Single'           },
  { title: 'codex.',                     meta: '2024 · Single'           },
  { title: 'eden.',                      meta: '2024 · Single · w/ Ølsten' },
];

const SERVICES = [
  { icon: '🎛', name: 'Music Production',             desc: 'Full track production from concept to master-ready file. Genres range from electronic and ambient to hip-hop and experimental. You bring the idea, I build the world around it.',                                                                                tags: ['Ableton Live','Electronic','Hip-Hop','Ambient'],                       price: 'From $149', delivery: '5–7 day delivery' },
  { icon: '🎨', name: 'Graphic Design & Artwork',     desc: 'Album covers, single artwork, EP layouts, and brand identity for artists. Clean, minimal, or complex — every project gets its own visual language built to last across all platforms.',                                                                     tags: ['Album Art','Brand Identity','Typography','Print-Ready'],               price: 'From $89',  delivery: '3–5 day delivery' },
  { icon: '📡', name: 'Touch Designer Visuals',       desc: 'Generative and reactive visual systems for live performance, installations, and music videos. Audio-reactive, real-time, and built to run flawlessly. Available as looping exports or live-ready patches.',                                                  tags: ['Touch Designer','Generative','Audio-Reactive','Live'],                 price: 'From $249', delivery: '7 day delivery'   },
  { icon: '🎸', name: 'Guitar Recording (Session Work)', desc: 'Clean, distorted, or textural guitar takes recorded and delivered as dry and wet stems. Works across genres — whether you need a delicate fingerpicked layer or something heavier. Revision-friendly.',                                                  tags: ['Session Guitar','Dry Stems','Wet Stems','Multi-Genre'],               price: 'From $79',  delivery: '3 day delivery'   },
];

const POSTS = [
  {
    time: '3 days ago', type: 'Showcase', typeClass: 'showcase',
    title: 'new namibian electronic. is out now. three years in the making.',
    body: "This album started as a field recording experiment in 2022. What came out of it was something I didn't have a name for until I finished it. Fourteen tracks built from source material collected across three continents. Nothing sampled. Everything recorded, processed, and rebuilt from scratch.",
    attached: { title: 'new namibian electronic.', sub: 'lvminvs. · Album · Now on 44' },
    tags: ['Album','Electronic','Field Recording'],
    likes: '612', comments: '94',
  },
  {
    time: '2 weeks ago', type: 'Dev Log', typeClass: 'devlog',
    title: 'Touch Designer visual patch for "infinite." — here\'s how it works',
    body: 'The visual for infinite. is an audio-reactive particle system that maps frequency bands to particle velocity and color temperature. The whole thing runs in real-time at 120fps. Releasing the patch as a free download for anyone who owns the single on 44.',
    attached: null,
    tags: ['Touch Designer','Visuals','Free Download'],
    likes: '388', comments: '57',
  },
];

const ACTIVITY = [
  { dot: '#93FF00',                text: 'Released new namibian electronic.',               time: '3 days ago'  },
  { dot: 'rgba(100,160,255,0.80)', text: 'Posted Touch Designer walkthrough for infinite.', time: '2 weeks ago' },
  { dot: 'rgba(255,160,60,0.80)',  text: 'Completed 8 Guitar Recording bookings',           time: 'This month'  },
  { dot: '#93FF00',                text: 'Released the lvminary: exhibition 2',             time: 'Last month'  },
];

const LINKS = [
  { icon: '🔗', label: 'lvminvs.44.io'              },
  { icon: '▶',  label: 'YouTube · 4.2K subscribers' },
  { icon: '📷', label: 'Instagram · @lvminvs'        },
  { icon: '☁',  label: 'SoundCloud · lvminvs'        },
];

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  showcase: { background: 'rgba(160,100,255,0.12)', border: '1px solid rgba(160,100,255,0.22)', color: 'rgba(200,160,255,0.90)' },
  devlog:   { background: 'rgba(100,140,255,0.12)', border: '1px solid rgba(100,140,255,0.22)', color: 'rgba(160,190,255,0.90)' },
};

/* ── page ── */
export default function ProfilePage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      {/* ── BANNER ── */}
      <div style={{ width: '100%', height: 180, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,20,60,0.9) 0%, rgba(30,10,50,0.8) 40%, rgba(5,15,40,0.95) 100%)' }} />
      </div>

      {/* ── PROFILE ROW ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 28px', marginTop: -36, position: 'relative', zIndex: 2, marginBottom: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '3px solid #0A0A12', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }} />
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
            lvminvs.{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93FF00' }}>✦ Verified</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Producer · Graphic Designer · Touch Designer · Guitarist</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 4, flexShrink: 0 }}>
          <button style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: 9999, padding: '9px 22px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>+ Follow</button>
          <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9999, padding: '9px 22px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Message</button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ display: 'flex', padding: '0 28px', marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ display: 'flex', gap: 14, padding: '0 28px 32px' }}>

        {/* main column — all sections always visible */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* RELEASES */}
          <div>
            <BlockHeader title="Releases" sub="7 releases" />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
              {RELEASES.map((r, i) => (
                <div key={i} style={{ cursor: 'pointer', flexShrink: 0, width: 150 }}>
                  <div style={{ width: 150, height: 150, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, marginBottom: 9 }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>{r.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SERVICES */}
          <div>
            <BlockHeader title="Services" sub="4 available" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SERVICES.map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '20px 22px', display: 'flex', gap: 20, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <div style={{ width: 52, height: 52, flexShrink: 0, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 5, letterSpacing: '-0.01em' }}>{s.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.tags.map(tag => (
                        <div key={tag} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>{tag}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.price}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{s.delivery}</div>
                    </div>
                    <button style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 9999, padding: '8px 20px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)', cursor: 'pointer' }}>Enquire</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* POSTS */}
          <div>
            <BlockHeader title="Posts" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {POSTS.map((p, i) => (
                <PostCard key={i} {...p} />
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          <SidePanel title="About">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 12 }}>
              Producer, designer, visualist, and guitarist operating at the intersection of sound and image. Every project is its own closed system, built from the ground up with its own rules, aesthetic, and reason for existing.
            </div>
            {[
              { icon: '🎛', text: 'Ableton Live, Serum, Reaktor'           },
              { icon: '🖥', text: 'Touch Designer, Resolume'                },
              { icon: '🎨', text: 'Photoshop, Illustrator, Figma'           },
              { icon: '🎸', text: 'Guitar, bass, and things that make noise' },
              { icon: '📅', text: 'On 44 since January 2025'                },
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
                <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{d.icon}</span>{d.text}
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Links">
            {LINKS.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, width: 16, textAlign: 'center', color: 'rgba(255,255,255,0.40)' }}>{l.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{l.label}</span>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Recent Activity">
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: a.dot }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>{a.text}</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Top Review">
            <div style={{ fontSize: 13, color: 'rgba(255,190,0,0.85)', letterSpacing: 1, marginBottom: 6 }}>★★★★★</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 6 }}>
              &quot;Worked with lvminvs. on album artwork and it was one of the smoothest creative experiences I&apos;ve had. Delivered way more than expected. The work is genuinely exceptional.&quot;
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.28)' }}>— Ølsten · Graphic Design service</div>
          </SidePanel>

        </div>
      </div>
    </div>
  );
}

/* ── sub-components ── */

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function BlockHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>{sub}</div>}
    </div>
  );
}

function PostCard({ time, type, typeClass, title, body, attached, tags, likes, comments }: {
  time: string; type: string; typeClass: string; title: string; body: string;
  attached: { title: string; sub: string } | null; tags: string[]; likes: string; comments: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.09)'}`, backdropFilter: 'blur(24px)', borderRadius: 16, padding: '20px 22px', cursor: 'pointer', transition: 'border-color 150ms ease, background 150ms ease' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>lvminvs.</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>{time}</div>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 6, ...TYPE_STYLES[typeClass] }}>{type}</div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.7, marginBottom: 14 }}>{body}</div>
      {attached && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{attached.title}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{attached.sub}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {tags.map(tag => (
          <div key={tag} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>{tag}</div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>♡ {likes}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>💬 {comments}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>🔖 Save</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}>Share →</div>
      </div>
    </div>
  );
}
