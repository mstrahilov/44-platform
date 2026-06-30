'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import AuthControls from '@/components/AuthControls';

type Tab = { label: string; href: string };

const SECTION_TABS: Record<string, Tab[]> = {
  '/': [
    { label: 'Featured', href: '/' },
    { label: 'Music', href: '/store/music' },
    { label: 'Books', href: '/store/books' },
    { label: 'Games', href: '/store/games' },
    { label: 'Apparel', href: '/store/apparel' },
    { label: 'Assets', href: '/store/assets' },
  ],
  '/services': [
    { label: 'Featured', href: '/services' },
    { label: 'Audio', href: '/services/browse?category=audio' },
    { label: 'Video', href: '/services/browse?category=video' },
    { label: 'Design', href: '/services/browse?category=design' },
    { label: 'Development', href: '/services/browse?category=development' },
    { label: 'Marketing', href: '/services/browse?category=marketing' },
    { label: 'Business', href: '/services/browse?category=business' },
  ],
  '/resources': [
    { label: 'Featured', href: '/resources' },
    { label: 'Guides', href: '/resources/browse?category=guides' },
    { label: 'Templates', href: '/resources/browse?category=templates' },
    { label: 'Lessons', href: '/resources/browse?category=lessons' },
    { label: 'Tools', href: '/resources/browse?category=tools' },
    { label: 'Videos', href: '/resources/browse?category=videos' },
    { label: 'Articles', href: '/resources/browse?category=articles' },
  ],
  '/community': [
    { label: 'Featured', href: '/community' },
    { label: 'Showcase', href: '/community/browse?category=showcase' },
    { label: 'Questions', href: '/community/browse?category=questions' },
    { label: 'Collaboration', href: '/community/browse?category=collaboration' },
    { label: 'Updates', href: '/community/browse?category=updates' },
    { label: 'Discussion', href: '/community/browse?category=discussion' },
  ],
  '/library': [
    { label: 'All', href: '/library' },
    { label: 'Music', href: '/library/music' },
    { label: 'Books', href: '/library/books' },
    { label: 'Apparel', href: '/library/apparel' },
    { label: 'Assets', href: '/library/assets' },
  ],
  '/notifications': [
    { label: 'All', href: '/notifications' },
    { label: 'Activity', href: '/notifications?tab=activity' },
    { label: 'Mentions', href: '/notifications?tab=mentions' },
    { label: 'Updates', href: '/notifications?tab=updates' },
  ],
  '/messages': [
    { label: 'All', href: '/messages' },
    { label: 'Direct', href: '/messages?tab=direct' },
    { label: 'Groups', href: '/messages?tab=groups' },
  ],
  '/friends': [
    { label: 'All', href: '/friends' },
    { label: 'Following', href: '/friends?tab=following' },
    { label: 'Followers', href: '/friends?tab=followers' },
    { label: 'Find Friends', href: '/friends?tab=find' },
  ],
  '/achievements': [
    { label: 'All', href: '/achievements' },
    { label: 'Earned', href: '/achievements?tab=earned' },
    { label: 'Locked', href: '/achievements?tab=locked' },
    { label: 'Collections', href: '/achievements?tab=collections' },
  ],
};

// Segments that are category pages within a section (not sub-nav sections themselves)
const STORE_CATEGORIES = ['music', 'books', 'games', 'apparel', 'assets'];
const SERVICE_CATEGORIES = ['audio', 'video', 'design', 'development', 'marketing', 'business'];
const RESOURCE_CATEGORIES = ['guides', 'templates', 'lessons', 'tools', 'videos', 'articles'];
const COMMUNITY_CATEGORIES = ['showcase', 'questions', 'collaboration', 'updates', 'discussion'];
const LIBRARY_CATEGORIES = ['music', 'books', 'apparel', 'assets'];

function getActiveSection(pathname: string): string {
  const seg = pathname.split('/')[1] ?? '';
  const seg2 = pathname.split('/')[2] ?? '';

  if (seg === 'store' && STORE_CATEGORIES.includes(seg2)) return '/';
  if (seg === 'services' && SERVICE_CATEGORIES.includes(seg2)) return '/services';
  if (seg === 'resources' && RESOURCE_CATEGORIES.includes(seg2)) return '/resources';
  if (seg === 'community' && COMMUNITY_CATEGORIES.includes(seg2)) return '/community';
  if (seg === 'library' && LIBRARY_CATEGORIES.includes(seg2)) return '/library';

  if (pathname.startsWith('/services')) return '/services';
  if (pathname.startsWith('/resources')) return '/resources';
  if (pathname.startsWith('/community')) return '/community';
  if (pathname.startsWith('/library')) return '/library';
  if (pathname.startsWith('/notifications')) return '/notifications';
  if (pathname.startsWith('/messages')) return '/messages';
  if (pathname.startsWith('/friends')) return '/friends';
  if (pathname.startsWith('/achievements')) return '/achievements';
  return '/';
}

function isTabActive(tabHref: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [tabPath, tabQuery] = tabHref.split('?');
  if (pathname !== tabPath) return false;
  if (!tabQuery) return searchParams.toString() === '';
  const tabParams = new URLSearchParams(tabQuery);
  for (const [key, val] of tabParams) {
    if (searchParams.get(key) !== val) return false;
  }
  return true;
}

function TabsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = getActiveSection(pathname);
  const tabs = SECTION_TABS[section] ?? [];

  return (
    <div className="ctb-tabs">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={isTabActive(tab.href, pathname, searchParams) ? 'ctb-tab ctb-tab-active' : 'ctb-tab'}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function ContentTabBar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchVal.trim();
    if (!q) { setSearchOpen(false); return; }
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchVal('');
  }

  return (
    <div className="content-tab-bar">
      <Suspense fallback={<div className="ctb-tabs" />}>
        <TabsInner />
      </Suspense>

      <div className="ctb-controls">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="ctb-search-form">
            <input
              autoFocus
              className="ctb-search-input"
              placeholder="Search 44…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onBlur={() => { if (!searchVal) setSearchOpen(false); }}
              onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchVal(''))}
            />
          </form>
        ) : (
          <button className="ctb-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="m10 10 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <Link href="/notifications" className="ctb-icon-btn" aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1.5a4.5 4.5 0 0 1 4.5 4.5v2.25l.9 1.8H2.1l.9-1.8V6A4.5 4.5 0 0 1 7.5 1.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/>
            <path d="M6 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.35"/>
          </svg>
        </Link>

        <AuthControls />
      </div>
    </div>
  );
}
