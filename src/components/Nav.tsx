'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Store',     href: '/' },
  { label: 'Library',   href: '/library' },
  { label: 'Community', href: '/community' },
  { label: 'Profile',   href: '/profile' },
];

export default function Nav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal]   = useState('');

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 32px',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Settings icon — left */}
      <button className="btn-icon" style={{ position: 'absolute', left: 32 }} aria-label="Settings">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M12.2 9a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 0 1-1.7 1.7l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V13a1.2 1.2 0 0 1-2.4 0v-.06a1 1 0 0 0-.65-.91 1 1 0 0 0-1.1.2l-.04.04a1.2 1.2 0 0 1-1.7-1.7l.04-.04A1 1 0 0 0 3.1 9a1 1 0 0 0-.92-.6H2a1.2 1.2 0 0 1 0-2.4h.06a1 1 0 0 0 .91-.65 1 1 0 0 0-.2-1.1l-.04-.04a1.2 1.2 0 0 1 1.7-1.7l.04.04A1 1 0 0 0 5.58 2.1 1 1 0 0 0 6.5 1.5V2a1.2 1.2 0 0 1 2.4 0v.06a1 1 0 0 0 .6.91 1 1 0 0 0 1.1-.2l.04-.04a1.2 1.2 0 0 1 1.7 1.7l-.04.04A1 1 0 0 0 12.1 6a1 1 0 0 0 .9.5H13a1.2 1.2 0 0 1 0 2.4h-.06a1 1 0 0 0-.74.1Z" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </button>

      {/* Nav pill — center */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--glass-flush-bg)',
        border: '1px solid var(--glass-flush-br)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 'var(--r-pill)',
        padding: 5,
      }}>
        {NAV_ITEMS.map(({ label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '8px 20px',
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: active ? 'var(--t1)' : 'var(--t3)',
                borderRadius: 'var(--r-pill)',
                border: active ? '1px solid var(--glass-elev-br)' : '1px solid transparent',
                background: active ? 'var(--glass-elev-bg)' : 'transparent',
                transition: 'color 150ms ease, background 150ms ease, border-color 150ms ease',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Search — right */}
      <div style={{
        position: 'absolute',
        right: 32,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* expanding search input */}
        <div style={{
          width: searchOpen ? 200 : 0,
          overflow: 'hidden',
          opacity: searchOpen ? 1 : 0,
          transition: 'width 280ms cubic-bezier(0.4,0,0.2,1), opacity 220ms ease',
        }}>
          <input
            className="input"
            placeholder="Search..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
            autoFocus={searchOpen}
            style={{ fontSize: 12 }}
          />
        </div>

        {/* search icon button */}
        <button
          className="btn-icon"
          onClick={() => setSearchOpen(v => !v)}
          aria-label="Search"
          style={{
            opacity: searchOpen ? 0 : 1,
            pointerEvents: searchOpen ? 'none' : 'auto',
            transform: searchOpen ? 'scale(0.85)' : 'scale(1)',
            transition: 'opacity 200ms ease, transform 200ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="m9.5 9.5 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
