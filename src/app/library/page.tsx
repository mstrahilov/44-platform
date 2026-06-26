'use client';

import { useState } from 'react';

/* ── static data ── */
const LIBRARY_ITEMS = [
  { title: 'MUSES',                 artist: 'Tellali'        },
  { title: 'SOMA',                  artist: '44 CORPORATION' },
  { title: 'ELSEWHERE MYTH VOL. 1', artist: '44 CORPORATION' },
  { title: 'EVERYTHING AFTER',      artist: 'Ølsten'         },
  { title: 'EVERYTHING BEFORE',     artist: 'Ølsten'         },
  { title: 'JOZ',                   artist: 'Ølsten'         },
  { title: 'ELENΛ',                 artist: 'Ølsten'         },
  { title: 'KΛREN',                 artist: 'Ølsten'         },
  { title: 'GHOST',                 artist: 'Ølsten'         },
  { title: 'MASK',                  artist: 'Ølsten'         },
  { title: 'WAVES',                 artist: 'Ølsten'         },
  { title: 'THE GREAT SHADOWSEA',   artist: 'Ølsten'         },
];

const TRACKS = [
  { num: '01', name: 'Worshipping',        dur: '1:56' },
  { num: '02', name: 'Just Your Touch',    dur: '2:34' },
  { num: '03', name: 'Reprise I',          dur: '1:51' },
  { num: '04', name: 'Can You Tell',       dur: '2:51' },
  { num: '05', name: 'Reprise II',         dur: '1:52' },
  { num: '06', name: 'Blind',              dur: '2:22' },
  { num: '07', name: 'Night Rush By',      dur: '4:02' },
  { num: '08', name: 'Do You Remember Me?', dur: '2:06' },
];

const ACHIEVEMENTS = [
  { name: 'OVERACHIEVER', desc: 'Unlock all achievements. Unlocks the MUSES Digital Art Book.', earned: false },
  { name: 'LISTENER',     desc: 'Played all tracks from start to finish without skipping.',      earned: true  },
  { name: 'COLLECTOR',    desc: 'Own a physical copy of this release.',                           earned: true  },
  { name: 'SUPPORTER',    desc: 'Post a review for this release.',                                earned: false },
];

const EXTRAS = [
  { label: 'Free',   labelColor: '#93FF00',              title: 'MUSES Lyric Book',      sub: 'Full lyrics, formatted for print.',         action: 'Download', locked: false },
  { label: 'Locked', labelColor: 'rgba(255,255,255,0.28)', title: 'MUSES Digital Art Book', sub: 'Unlock OVERACHIEVER to access.',           action: null,       locked: true  },
  { label: '$29.99', labelColor: 'rgba(255,255,255,0.65)', title: 'MUSES Hoodie',           sub: 'Available in all sizes. Ships worldwide.', action: 'Shop',     locked: false },
];

/* ── page ── */
export default function LibraryPage() {
  const [activeItem, setActiveItem] = useState(0);
  const [filter, setFilter] = useState('');

  const filtered = LIBRARY_ITEMS.filter(i =>
    i.title.toLowerCase().includes(filter.toLowerCase()) ||
    i.artist.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      padding: '0 28px 28px',
      gap: 14,
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 234,
        flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* search */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <input
            className="input"
            placeholder="Filter your library..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ fontSize: 12, padding: '7px 11px', borderRadius: 10 }}
          />
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {filtered.map((item, i) => {
            const idx = LIBRARY_ITEMS.indexOf(item);
            const active = idx === activeItem;
            return (
              <div
                key={i}
                onClick={() => setActiveItem(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 8px', borderRadius: 10, cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
                  transition: 'background 120ms ease, border-color 120ms ease',
                  marginBottom: 2,
                }}
              >
                <div style={{
                  width: 34, height: 34,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 6, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artist}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

        {/* release header */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 16, padding: 22,
          display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>
          {/* art */}
          <div style={{
            width: 96, height: 96,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10, flexShrink: 0,
          }} />
          {/* info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>EP</div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, color: '#fff', marginBottom: 5 }}>MUSES</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
              by <span style={{ color: 'rgba(255,255,255,0.80)', cursor: 'pointer' }}>Tellali</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Hip-Hop', 'Electronic', 'Alternative'].map(tag => (
                <div key={tag} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 7, padding: '3px 9px',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}>{tag}</div>
              ))}
            </div>
          </div>
          {/* actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button style={{
              background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(24px)', borderRadius: 9999,
              padding: '11px 26px',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              color: '#fff', cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>▶ Play</button>
            <div style={{
              width: 38, height: 38,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(24px)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.50)',
              fontSize: 16, fontWeight: 700,
            }}>···</div>
          </div>
        </div>

        {/* stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { value: '14',    label: 'Total Listens'  },
            { value: '2 / 4', label: 'Achievements'   },
            { value: 'Today', label: 'Last Listened'  },
          ].map(({ value, label }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 16, padding: '18px 22px',
              transition: 'border-color 150ms ease, background 150ms ease',
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1, marginBottom: 5 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* tracklist */}
        <Panel title="Tracklist" meta="8 tracks">
          {TRACKS.map((t, i) => (
            <TrackRow key={i} {...t} last={i === TRACKS.length - 1} />
          ))}
        </Panel>

        {/* creators */}
        <Panel title="Creators">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              { name: 'Tellali', role: 'Artist',   followers: '251 followers' },
              { name: 'Ølsten',  role: 'Producer', followers: '44 followers'  },
            ].map(c => (
              <div key={c.name} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 13,
                cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}>
                <div style={{
                  width: 42, height: 42,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '50%', flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{c.role}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}>{c.followers}</div>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.18)' }}>›</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* achievements */}
        <Panel title="Achievements" right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}>2 of 4</span>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2.5"/>
              <circle cx="14" cy="14" r="11" fill="none" stroke="#93FF00" strokeWidth="2.5"
                strokeDasharray="34.56 69.12" strokeDashoffset="17.28"
                strokeLinecap="round" transform="rotate(-90 14 14)"/>
            </svg>
            <button style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 9999, padding: '4px 12px',
              fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            }}>View All</button>
          </div>
        }>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {ACHIEVEMENTS.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${a.earned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: a.earned ? 1 : 0.38,
                transition: 'border-color 150ms ease, background 150ms ease',
              }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)',
                  borderRadius: 10,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.03em', marginBottom: 3 }}>{a.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{a.desc}</div>
                </div>
                <div style={{
                  flexShrink: 0,
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
                  color: a.earned ? '#93FF00' : 'rgba(255,255,255,0.20)',
                }}>{a.earned ? 'Earned' : 'Locked'}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* extras */}
        <Panel title="Extras">
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {EXTRAS.map((e, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 14,
                minWidth: 174, maxWidth: 174, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                opacity: e.locked ? 0.48 : 1,
                cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: e.labelColor, marginBottom: 10 }}>{e.label}</div>
                <div style={{ width: '100%', height: 88, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 11, flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.90)', marginBottom: 4, lineHeight: 1.3 }}>{e.title}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.32)', lineHeight: 1.45, flex: 1 }}>{e.sub}</div>
                {e.action && (
                  <div style={{
                    marginTop: 12, display: 'inline-block',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 9999, padding: '5px 13px',
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                    color: 'rgba(255,255,255,0.70)', cursor: 'pointer', letterSpacing: '0.04em', alignSelf: 'flex-start',
                  }}>{e.action}</div>
                )}
                {e.locked && (
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

/* ── sub-components ── */

function Panel({ title, meta, right, children }: {
  title: string; meta?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 16, padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', flex: 1 }}>{title}</div>
        {meta && <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>{meta}</div>}
        {right}
      </div>
      {children}
    </div>
  );
}

function TrackRow({ num, name, dur, last }: { num: string; name: string; dur: string; last: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 6px',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', borderRadius: 8,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.22)', width: 18, textAlign: 'right', flexShrink: 0 }}>{num}</div>
      <div style={{
        width: 26, height: 26,
        background: hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.11)'}`,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: 'rgba(255,255,255,0.60)', flexShrink: 0,
        transition: 'background 150ms ease, border-color 150ms ease',
      }}>▶</div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: hovered ? '#fff' : 'rgba(255,255,255,0.85)', transition: 'color 120ms ease' }}>{name}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{dur}</div>
    </div>
  );
}
