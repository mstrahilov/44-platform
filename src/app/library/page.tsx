'use client';

import { useState } from 'react';

/* ── static data ── */
const SIDEBAR_ITEMS = [
  { title: 'Always',               artist: 'spiiriit'        },
  { title: 'SOMA',                 artist: '44 CORPORATION'  },
  { title: 'MYTHOLOGY VOL. I',     artist: '44 CORPORATION'  },
  { title: 'EVERYTHING AFTER',     artist: 'Ølsten'          },
  { title: 'EVERYTHING BEFORE',    artist: 'Ølsten'          },
  { title: 'JOZ',                  artist: 'Ølsten'          },
  { title: 'ELENΛ',               artist: 'Ølsten'          },
  { title: 'KΛREN',               artist: 'Ølsten'          },
  { title: 'GHOST',                artist: 'Ølsten'          },
  { title: 'MASK',                 artist: 'Ølsten'          },
  { title: 'WAVES',                artist: 'Ølsten'          },
  { title: 'THE GREAT SHADOWSEA',  artist: 'Ølsten'          },
];

const TRACKS = [
  { num: '01', name: 'Samodiva',                                                           dur: '0:34' },
  { num: '02', name: 'Fade Interlude',                                                     dur: '0:35' },
  { num: '03', name: 'Away (feat. ØLSTEN)',                                                dur: '2:54' },
  { num: '04', name: 'Something Sweet Mixed With Something Bitter',                        dur: '1:34' },
  { num: '05', name: 'Surrender (feat. Oliander)',                                         dur: '3:41' },
  { num: '06', name: 'All I\'ve Ever Known (feat. Gabrielle Marcí & Wasé Taiwo)',          dur: '2:39' },
  { num: '07', name: 'Wait For Me (feat. ZK king)',                                        dur: '2:44' },
  { num: '08', name: 'Waste Ur Time',                                                      dur: '2:51' },
  { num: '09', name: 'Makdes',                                                             dur: '2:02' },
  { num: '10', name: 'Come Alive',                                                         dur: '3:33' },
  { num: '11', name: 'Images of Broken Light',                                             dur: '1:01' },
  { num: '12', name: 'Connection, Memory + Belief',                                        dur: '1:42' },
  { num: '13', name: 'Memory: Studies for Piano and Violin in E-Flat Minor',               dur: '3:59' },
];

const CREATORS = [
  { name: 'spiiriit',  role: 'ARTIST', followers: '251 followers' },
  { name: 'Oliander',  role: 'ARTIST', followers: '244 followers' },
];

const ACHIEVEMENTS = [
  { name: 'OVERACHIEVER', desc: 'Unlock all achievements. Unlocks Art Book.', earned: false },
  { name: 'LISTENER',     desc: 'Played all tracks from start to finish without skipping.', earned: false },
  { name: 'COLLECTOR',    desc: 'Own a physical copy of this release.', earned: true },
  { name: 'SUPPORTER',    desc: 'Post a review for this release.', earned: true },
];

const EXTRAS = [
  { label: 'FREE',   labelColor: '#93FF00',                   title: 'Always (Lyric Book)',  sub: 'Full lyrics, formatted for print.',       action: 'Download', locked: false },
  { label: 'Locked', labelColor: 'rgba(255,255,255,0.28)',    title: 'Always (Art Book)',    sub: 'Unlock OVERACHIEVER to access.',           action: null,       locked: true  },
  { label: 'N$40',   labelColor: 'rgba(255,255,255,0.65)',    title: 'Always (CD)',          sub: 'Physical copy for your collection.',       action: 'Shop',     locked: false },
];

/* ── page ── */
export default function LibraryPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 12, padding: '0 12px 12px' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 234, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 8px' }}>
          <input
            type="text"
            placeholder="Filter your library..."
            style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: '#fff', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {SIDEBAR_ITEMS.map((item, i) => (
            <div
              key={i}
              onClick={() => setActiveIndex(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: activeIndex === i ? 'rgba(255,255,255,0.09)' : 'transparent', borderLeft: activeIndex === i ? '2px solid #93FF00' : '2px solid transparent', transition: 'background 120ms ease' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.09)' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: activeIndex === i ? '#fff' : 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{item.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* RELEASE HEADER */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: 20, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.09)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>ALBUM</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>Always</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>by <span style={{ color: 'rgba(255,255,255,0.75)' }}>spiiriit</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Electronic', 'Downtempo', 'Ambient'].map(tag => (
                <div key={tag} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.55)' }}>{tag}</div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button style={{ background: '#93FF00', border: 'none', borderRadius: 9999, padding: '10px 24px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#0A0A12', cursor: 'pointer', letterSpacing: '0.04em' }}>▶ Play</button>
            <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9999, padding: '8px 18px', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', letterSpacing: '0.1em' }}>···</button>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { value: '1,256', label: 'Total Listens' },
            { value: '2 / 4', label: 'Achievements' },
            { value: 'Today',  label: 'Last Listened' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 14, padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TRACKLIST */}
        <Panel title="Tracklist" sub={`${TRACKS.length} tracks`}>
          {TRACKS.map((t, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredTrack(i)}
              onMouseLeave={() => setHoveredTrack(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 8, background: hoveredTrack === i ? 'rgba(255,255,255,0.06)' : 'transparent', cursor: 'pointer', transition: 'background 120ms ease' }}
            >
              <div style={{ width: 24, textAlign: 'right', fontSize: 11, fontWeight: 600, color: hoveredTrack === i ? 'transparent' : 'rgba(255,255,255,0.25)', position: 'relative' }}>
                {hoveredTrack === i ? <span style={{ position: 'absolute', right: 0, color: 'rgba(255,255,255,0.55)' }}>▶</span> : t.num}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: hoveredTrack === i ? '#fff' : 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }}>{t.dur}</div>
            </div>
          ))}
        </Panel>

        {/* CREATORS */}
        <Panel title="Creators">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 6px' }}>
            {CREATORS.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', marginTop: 2 }}>{c.role}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>{c.followers}</div>
                </div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }}>›</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ACHIEVEMENTS */}
        <Panel title="Achievements" extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" />
                <circle cx="14" cy="14" r="11" fill="none" stroke="#93FF00" strokeWidth="2.5" strokeDasharray="34.56 69.12" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 14 14)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#93FF00' }}>2/4</div>
            </div>
            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9999, padding: '4px 12px', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', cursor: 'pointer', letterSpacing: '0.04em' }}>View All</button>
          </div>
        }>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 6px' }}>
            {ACHIEVEMENTS.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${a.earned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, opacity: a.earned ? 1 : 0.75 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.03em', marginBottom: 3 }}>{a.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{a.desc}</div>
                </div>
                <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: a.earned ? '#93FF00' : 'rgba(255,255,255,0.20)' }}>
                  {a.earned ? 'Earned' : 'Locked'}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* EXTRAS */}
        <Panel title="Extras">
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {EXTRAS.map((e, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, minWidth: 174, maxWidth: 174, flexShrink: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer', opacity: e.locked ? 0.48 : 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: e.labelColor, marginBottom: 10 }}>{e.label}</div>
                <div style={{ width: '100%', height: 88, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 11, flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.90)', marginBottom: 4, lineHeight: 1.3 }}>{e.title}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.32)', lineHeight: 1.45, flex: 1 }}>{e.sub}</div>
                {e.action && (
                  <div style={{ marginTop: 12, display: 'inline-block', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9999, padding: '5px 13px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.04em', alignSelf: 'flex-start' }}>{e.action}</div>
                )}
                {!e.action && e.locked && (
                  <div style={{ marginTop: 10, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>Earn Overachiever</div>
                )}
              </div>
            ))}
          </div>
        </Panel>

      </main>
    </div>
  );
}

/* ── sub-component ── */
function Panel({ title, sub, extra, children }: { title: string; sub?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
        {extra}
      </div>
      {children}
    </div>
  );
}
