'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import AuthControls from '@/components/AuthControls';

const NAV_ITEMS = [
  { label: 'Store', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Community', href: '/community' },
  { label: 'Profile', href: '/profile' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const searchRef = useRef<HTMLFormElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch();
  }

  function runSearch() {
    const query = searchVal.trim();
    if (!query) {
      setSearchOpen(true);
      return;
    }

    router.push(`/browse?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  }

  return (
    <header className="nav-shell">
      <div className="nav-left">
        <Link href="/" className="brand-button" aria-label="44 Store">
          44
        </Link>
      </div>

      <nav className="nav-pill" aria-label="Primary">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'nav-item nav-item-active' : 'nav-item'}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="nav-right">
        <form
          ref={searchRef}
          onSubmit={submitSearch}
          className={searchOpen ? 'nav-search nav-search-open' : 'nav-search'}
        >
          <input
            ref={searchInputRef}
            className="nav-search-input"
            placeholder="Search 44"
            value={searchVal}
            onChange={event => setSearchVal(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                setSearchOpen(false);
                setSearchVal('');
              }
            }}
            aria-label="Search 44"
          />
          <button
            className="nav-search-button"
            type="button"
            onPointerDown={event => {
              event.stopPropagation();
            }}
            onClick={() => {
              if (searchOpen) {
                runSearch();
              } else {
                setSearchOpen(true);
              }
            }}
            aria-label={searchOpen ? 'Submit search' : 'Open search'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="m9.5 9.5 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <AuthControls />
      </div>
    </header>
  );
}
