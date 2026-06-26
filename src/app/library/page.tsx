'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ── types ── */
interface Release {
  id: string;
  title: string;
  artist: string;
  type: string;
  tags: string[];
}

interface Track {
  id: string;
  number: number;
  name: string;
  duration: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

interface Extra {
  id: string;
  label: string;
  label_type: string;
  title: string;
  subtitle: string;
  action: string | null;
  locked: boolean;
}

interface LibraryItem {
  release_id: string;
  listen_count: number;
  last_listened: string;
}

const SIDEBAR_ITEMS = [
  { title: 'Always',              artist: 'spiiriit',       id: 'a1000000-0000-0000-0000-000000000001' },
  { title: 'SOMA',                artist: '44 CORPORATION', id: null },
  { title: 'MYTHOLOGY VOL. I',    artist: '44 CORPORATION', id: null },
  { title: 'EVERYTHING AFTER',    artist: 'Ølsten',         id: null },
  { title: 'EVERYTHING BEFORE',   artist: 'Ølsten',         id: null },
  { title: 'JOZ',                 artist: 'Ølsten',         id: null },
  { title: 'ELENΛ',              artist: 'Ølsten',         id: null },
  { title: 'KΛREN',              artist: 'Ølsten',         id: null },
  { title: 'GHOST',               artist: 'Ølsten',         id: null },
  { title: 'MASK',                artist: 'Ølsten',         id: null },
  { title: 'WAVES',               artist: 'Ølsten',         id: null },
  { title: 'THE GREAT SHADOWSEA', artist: 'Ølsten',         id: null },
];

const LABEL_COLORS: Record<string, string> = {
  free:   '#93FF00',
  locked: 'rgba(255,255,255,0.28)',
  paid:   'rgba(255,255,255,0.65)',
};

export default function LibraryPage() {
  const [activeIndex, setActiveIndex]   = useState(0);
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);
  const [release, setRelease]           = useState<Release | null>(null);
  const [tracks, setTracks]             = useState<Track[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [extras, setExtras]             = useState<Extra[]>([]);
  const [libItem, setLibItem]           = useState<LibraryItem | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const item = SIDEBAR_ITEMS[activeIndex];
    if (!item.id) {
      setRelease(null);
      setTracks([]);
      setAchievements([]);
      setExtras([]);
      setLibItem(null);
      setLoading(false);
      return;
    }

    async function fetchRelease(id: string) {
  setLoading(true);

  const [
    { data: rel, error: relError },
    { data: trks },
    { data: achs },
    { data: exts },
    { data: lib },
  ] = await Promise.all([
    supabase.from('releases').select('*').eq('id', id).single(),
    supabase.from('tracks').select('*').eq('release_id', id).order('number'),
    supabase.from('achievements').select('*').eq('release_id', id),
    supabase.from('extras').select('*').eq('release_id', id),
    supabase.from('library_items').select('*').eq('release_id', id).single(),
  ]);

  console.log('release data:', rel);
  console.log('release error:', relError);

  setRelease(rel);
  setTracks(trks ?? []);
  setAchievements(achs ?? []);
  setExtras(exts ?? []);
  setLibItem(lib);
  setLoading(false);
}

    fetchRelease(item.id);
  }, [activeIndex]);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount  = achievements.length;

  const lastListened = libItem?.last_listened
    ? new Date(libItem.last_listened).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 12, padding: '0 12px 12px' }}>

      {/* SIDEBAR */}
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

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500 }}>Loading...</div>
        ) : !release ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.20)', fontSize: 13, fontWeight: 500 }}>Not yet in Supabase</div>
        ) : (
          <>
            {/* RELEASE HEADER */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: 20, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.09)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{release.type}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>{release.title}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>by <span style={{ color: 'rgba(255,255,255,0.75)' }}>{release.artist}</span></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {release.tags.map(tag => (
                    <div key={tag} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.55)' }}>{tag}</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <button style={{ background: '#93FF00', border: 'none', borderRadius: 9999, padding: '10px 24px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#0A0A12', cursor: 'pointer' }}>▶ Play</button>
                <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9999, padding: '8px 18px', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>···</button>
              </div>
            </div>

            {/* STATS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { value: libItem?.listen_count?.toLocaleString() ?? '0', label: 'Total Listens' },
                { value: `${earnedCount} / ${totalCount}`,               label: 'Achievements'  },
                { value: lastListened,                                    label: 'Last Listened' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 14, padding: '14px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* TRACKLIST */}
            <Panel title="Tracklist" sub={`${tracks.length} tracks`}>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  onMouseEnter={() => setHoveredTrack(i)}
                  onMouseLeave={() => setHoveredTrack(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 8, background: hoveredTrack === i ? 'rgba(255,255,255,0.06)' : 'transparent', cursor: 'pointer', transition: 'background 120ms ease' }}
                >
                  <div style={{ width: 24, textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)', position: 'relative' }}>
                    {hoveredTrack === i ? <span style={{ position: 'absolute', right: 0, color: 'rgba(255,255,255,0.55)' }}>▶</span> : String(t.number).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: hoveredTrack === i ? '#fff' : 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }}>{t.duration}</div>
                </div>
              ))}
            </Panel>

            {/* ACHIEVEMENTS */}
            <Panel title="Achievements" extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                <div style={{ position: 'relative', width: 28, height: 28 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" />
                    <circle cx="14" cy="14" r="11" fill="none" stroke="#93FF00" strokeWidth="2.5"
                      strokeDasharray={`${totalCount > 0 ? (earnedCount / totalCount) * 69.12 : 0} 69.12`}
                      strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 14 14)" />
                  </svg>
                </div>
                <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9999, padding: '4px 12px', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', cursor: 'pointer' }}>View All</button>
              </div>
            }>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 6px' }}>
                {achievements.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${a.earned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, opacity: a.earned ? 1 : 0.75 }}>
                    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.03em', marginBottom: 3 }}>{a.name}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{a.description}</div>
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
                {extras.map(e => (
                  <div key={e.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, minWidth: 174, maxWidth: 174, flexShrink: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer', opacity: e.locked ? 0.48 : 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: LABEL_COLORS[e.label_type] ?? 'rgba(255,255,255,0.55)', marginBottom: 10 }}>{e.label}</div>
                    <div style={{ width: '100%', height: 88, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 11, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.90)', marginBottom: 4, lineHeight: 1.3 }}>{e.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.32)', lineHeight: 1.45, flex: 1 }}>{e.subtitle}</div>
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
          </>
        )}
      </main>
    </div>
  );
}

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
