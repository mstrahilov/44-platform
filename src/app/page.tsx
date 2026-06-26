'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

/* ── static data ── */
const FILTERS = ['All', 'Music', 'Games', 'Books', 'Sample Packs', 'Services', 'Merch', 'Free'];

const NEW_TRENDING = [
  { type: 'EP · Music',      title: 'MUSES',                  creator: 'Tellali',         price: '$7.99',  free: false },
  { type: 'Album · Music',   title: 'THE GREAT SHADOWSEA',    creator: 'Ølsten',           price: 'Free',   free: true  },
  { type: 'Game',            title: 'SOMA',                   creator: '44 CORPORATION',   price: '$14.99', free: false },
  { type: 'Book',            title: 'ELSEWHERE MYTH VOL. 1',  creator: '44 CORPORATION',   price: '$12.99', free: false },
  { type: 'Album · Music',   title: 'GHOST',                  creator: 'Ølsten',           price: 'Free',   free: true  },
  { type: 'Sample Pack',     title: 'AMBIENT STUDIES VOL. 1', creator: 'Ølsten',           price: '$9.99',  free: false },
];

const SERVICES = [
  { avatar: null, title: 'Mix & Master',                  desc: 'Professional audio mastering for your release. Delivered in stems-ready and streaming formats.', creator: 'Ølsten',  rating: '★ 5.0 · 14 reviews', price: 'From $149', delivery: '5 day delivery' },
  { avatar: null, title: 'Vocal Recording & Arrangement', desc: 'Studio-quality vocal takes, harmonies, and arrangement for your project.',                        creator: 'Tellali', rating: '★ 4.9 · 8 reviews',  price: 'From $99',  delivery: '7 day delivery' },
  { avatar: null, title: 'Music Consultation',            desc: 'One-hour session covering production direction, release strategy, and creative feedback.',         creator: 'Ølsten',  rating: '★ 5.0 · 6 reviews',  price: 'From $79',  delivery: '3 day delivery' },
];

const FEATURED = [
  { type: 'EP · 44 Exclusive',  title: 'MUSES',                 creator: 'Tellali',       desc: 'Eight tracks. No filler. A debut EP built on voice, touch, and memory. Produced by Ølsten.',                               price: '$7.99',  free: false },
  { type: 'Book · Lore',        title: 'ELSEWHERE MYTH VOL. 1', creator: '44 CORPORATION', desc: 'The first volume of the Book of Veth. Locations, factions, and the mythology of a world built inside a dream.',            price: '$12.99', free: false },
  { type: 'Game · Puzzle',      title: 'SOMA',                  creator: '44 CORPORATION', desc: 'First-person puzzle game. Copy a state from any object. Paste it onto another. Nothing is what it appears to be.',         price: '$14.99', free: false },
];

const SPOTLIGHT = [
  { name: 'lvminvs.',        meta: '1.2K followers · 7 releases'  },
  { name: 'Ølsten',          meta: '44 followers · 12 releases'   },
  { name: 'Tellali',         meta: '251 followers · 3 releases'   },
  { name: '44 CORPORATION',  meta: '312 followers · 4 releases'   },
  { name: 'SoundForge',      meta: '1.2K followers · 38 packs'    },
  { name: 'Elara Write',     meta: '5K followers · 5 novels'      },
];

interface Release {
  id: string;
  title: string;
  artist: string;
  type: string;
  tags: string[] | null;
}

/* ── component ── */
export default function StorePage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [liveReleases, setLiveReleases] = useState<Release[]>([]);
  const [ownedReleaseIds, setOwnedReleaseIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchReleases() {
      const { data } = await supabase
        .from('releases')
        .select('id,title,artist,type,tags')
        .order('title');

      setLiveReleases(data ?? []);
    }

    fetchReleases();
  }, []);

  useEffect(() => {
    async function fetchOwnedItems(userId: string) {
      const { data } = await supabase
        .from('library_items')
        .select('release_id')
        .eq('user_id', userId);

      setOwnedReleaseIds((data ?? []).map(item => item.release_id));
    }

    if (user) {
      fetchOwnedItems(user.id);
    } else {
      Promise.resolve().then(() => setOwnedReleaseIds([]));
    }
  }, [user]);

  async function addToLibrary(releaseId: string) {
    if (!user) {
      alert('Sign in first, then add this to your library.');
      return;
    }

    const { error } = await supabase
      .from('library_items')
      .upsert({
        user_id: user.id,
        release_id: releaseId,
        acquisition_type: 'free',
        listen_count: 0,
        last_listened: null,
      }, { onConflict: 'user_id,release_id' });

    if (error) {
      alert(`${error.message}. Run the Supabase user-library SQL migration, then refresh.`);
      return;
    }

    setOwnedReleaseIds(current => [...new Set([...current, releaseId])]);
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '0 28px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
        minHeight: 220,
        position: 'relative',
      }}>
        {/* blurred bg image placeholder */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.03)',
          opacity: 0.12,
        }} />

        {/* left content */}
        <div style={{
          position: 'relative', zIndex: 1,
          flex: 1, padding: '32px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            {/* live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(147,255,0,0.12)', border: '1px solid rgba(147,255,0,0.25)',
              borderRadius: 9999, padding: '4px 12px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#93FF00', marginBottom: 16, alignSelf: 'flex-start',
            }}>
              <div style={{ width: 5, height: 5, background: '#93FF00', borderRadius: '50%' }} />
              Featured Release
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
              EP · Hip-Hop · Electronic · Alternative
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', marginBottom: 6 }}>
              MUSES
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
              by Tellali
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {['44 Exclusive', 'Electronic', 'Alternative'].map(tag => (
                <div key={tag} style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7, padding: '3px 10px',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}>{tag}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>$7.99</div>
            <button className="btn-primary">Add to Library</button>
            <button className="btn-ghost">View Page</button>
          </div>
        </div>

        {/* right art */}
        <div style={{
          width: 260, flexShrink: 0, position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            width: 180, height: 180,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }} />
        </div>
      </div>

      {/* ── CATEGORY FILTERS ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, flexShrink: 0 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              background: activeFilter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeFilter === f ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: 9999,
              padding: '7px 16px',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: activeFilter === f ? '#fff' : 'rgba(255,255,255,0.40)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
              fontFamily: 'inherit',
            }}
          >{f}</button>
        ))}
      </div>

      {/* ── NEW & TRENDING ── */}
      <div>
        <SectionHeader title="New & Trending" link="See All →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {liveReleases.length > 0
            ? liveReleases.map(release => (
                <ProductCard
                  key={release.id}
                  type={`${release.type} · Music`}
                  title={release.title}
                  creator={release.artist}
                  price="Free"
                  free
                  owned={ownedReleaseIds.includes(release.id)}
                  onGet={() => addToLibrary(release.id)}
                />
              ))
            : NEW_TRENDING.map((p, i) => (
                <ProductCard key={i} {...p} />
              ))}
        </div>
      </div>

      {/* ── SERVICES ── */}
      <div>
        <SectionHeader title="Services" link="Browse All Services →" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SERVICES.map((s, i) => (
            <ServiceCard key={i} {...s} />
          ))}
        </div>
      </div>

      {/* ── FEATURED BY CREATORS ── */}
      <div>
        <SectionHeader title="Featured by Creators" link="See All →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {FEATURED.map((f, i) => (
            <FeaturedCard key={i} {...f} />
          ))}
        </div>
      </div>

      {/* ── CREATOR SPOTLIGHT ── */}
      <div>
        <SectionHeader title="Creator Spotlight" link="Browse All Creators →" />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {SPOTLIGHT.map((c, i) => (
            <SpotlightCard key={i} {...c} />
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── sub-components ── */

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
        {title}
      </div>
      <a href="#" style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
        {link}
      </a>
    </div>
  );
}

function ProductCard({ type, title, creator, price, free, owned = false, onGet }: { type: string; title: string; creator: string; price: string; free: boolean; owned?: boolean; onGet?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
      }}
    >
      {/* thumbnail */}
      <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.06)' }} />
      {/* body */}
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 4 }}>{type}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 2, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', marginBottom: 10 }}>{creator}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: free ? '#93FF00' : 'rgba(255,255,255,0.90)' }}>{price}</div>
          <button onClick={onGet} disabled={owned} style={{
            background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 9999, padding: '4px 12px',
            fontFamily: 'inherit', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.70)',
            cursor: owned ? 'default' : 'pointer', letterSpacing: '0.04em',
            opacity: owned ? 0.6 : 1,
          }}>{owned ? 'Owned' : 'Get'}</button>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ title, desc, creator, rating, price, delivery }: {
  title: string; desc: string; creator: string; rating: string; price: string; delivery: string; avatar: null;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      {/* avatar */}
      <div style={{
        width: 46, height: 46, flexShrink: 0,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '50%',
      }} />
      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.40)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{creator}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{rating}</div>
        </div>
      </div>
      {/* right */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{price}</div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{delivery}</div>
        </div>
        <button style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 9999, padding: '6px 16px',
          fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.70)',
          cursor: 'pointer', letterSpacing: '0.04em',
        }}>Enquire</button>
      </div>
    </div>
  );
}

function FeaturedCard({ type, title, creator, desc, price, free }: {
  type: string; title: string; creator: string; desc: string; price: string; free: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
      }}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 5 }}>{type}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 3, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{creator}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, flex: 1 }}>{desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: free ? '#93FF00' : 'rgba(255,255,255,0.90)' }}>{price}</div>
          <button className="btn-primary" style={{ padding: '7px 18px', fontSize: 12 }}>Get</button>
        </div>
      </div>
    </div>
  );
}

function SpotlightCard({ name, meta }: { name: string; meta: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', flexShrink: 0, minWidth: 200,
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <div style={{
        width: 40, height: 40, flexShrink: 0,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '50%',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{meta}</div>
        <div style={{ fontSize: 10, color: '#93FF00', fontWeight: 700, marginTop: 1 }}>✦ Verified</div>
      </div>
      <button style={{
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 9999, padding: '4px 12px',
        fontFamily: 'inherit', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
        cursor: 'pointer', letterSpacing: '0.05em', flexShrink: 0,
      }}>Follow</button>
    </div>
  );
}
