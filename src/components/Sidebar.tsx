'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

type NavChild = { label: string; href: string; icon?: React.ReactNode };
type NavSection = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  children: NavChild[];
};

/* ── Section icons (SF Symbol-inspired, stroke-based) ── */
const IconStore = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7l1.5-4h11L16 7"/>
    <path d="M2 7h14v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7z"/>
    <path d="M9 7v9"/>
    <path d="M2 7a3 3 0 0 0 6 0"/>
    <path d="M10 7a3 3 0 0 0 6 0"/>
  </svg>
);

const IconServices = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L4.5 9.5H9L8 16l5.5-7.5H9L10 2z"/>
  </svg>
);

const IconResources = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h6l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
    <path d="M10 2v4h4"/>
    <line x1="6" y1="10" x2="12" y2="10"/>
    <line x1="6" y1="13" x2="10" y2="13"/>
  </svg>
);

const IconCommunity = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l2 3 2-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
  </svg>
);

const IconCollection = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v12"/>
    <path d="M7 3v12"/>
    <path d="M11 3l3 12"/>
    <path d="M3 3h4"/>
    <path d="M3 15h4"/>
  </svg>
);

const IconStudio = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="6" height="6" rx="1.5"/>
    <rect x="10" y="2" width="6" height="6" rx="1.5"/>
    <rect x="2" y="10" width="6" height="6" rx="1.5"/>
    <rect x="10" y="10" width="6" height="6" rx="1.5"/>
  </svg>
);

const IconAccount = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="6" r="3"/>
    <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="2.5"/>
    <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"/>
  </svg>
);

/* ── Small child icons using public/icons ── */
const ChildIcon = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" width={15} height={15} style={{ opacity: 'inherit', filter: 'brightness(0) invert(1)' }} />
);

const STORE_CHILDREN: NavChild[] = [
  { label: 'Music',  href: '/store/music',  icon: <ChildIcon src="/icons/music.svg" /> },
  { label: 'Books',  href: '/store/books',  icon: <ChildIcon src="/icons/books.svg" /> },
  { label: 'Games',  href: '/store/games',  icon: <ChildIcon src="/icons/games.svg" /> },
  { label: 'Merch',  href: '/store/merch',  icon: <ChildIcon src="/icons/apparel.svg" /> },
  { label: 'Assets', href: '/store/assets', icon: <ChildIcon src="/icons/assets.svg" /> },
];

function getActiveSectionId(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/store')) return 'store';
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/resources')) return 'resources';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/collection')) return 'collection';
  return '';
}

function isChildActive(href: string, pathname: string, search: string): boolean {
  if (!href.includes('?')) return pathname === href;
  const [path, query] = href.split('?');
  if (pathname !== path) return false;
  const params = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [k, v] of params) {
    if (current.get(k) !== v) return false;
  }
  return true;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const activeSectionId = getActiveSectionId(pathname);
  const [openId, setOpenId] = useState<string>(activeSectionId);
  const search = '';

  const [serviceChildren, setServiceChildren] = useState<NavChild[]>([]);
  const [resourceChildren, setResourceChildren] = useState<NavChild[]>([]);
  const [communityChildren, setCommunityChildren] = useState<NavChild[]>([]);

  useEffect(() => {
    Promise.resolve().then(() => setOpenId(activeSectionId));
  }, [activeSectionId]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('scope, slug, name, sort_order')
        .in('scope', ['services', 'resources', 'posts'])
        .order('sort_order');
      if (!data) return;
      const svcs  = data.filter(c => c.scope === 'services').map(c => ({ label: c.name, href: `/services/browse/${c.slug}` }));
      const res   = data.filter(c => c.scope === 'resources').map(c => ({ label: c.name, href: `/resources/browse/${c.slug}` }));
      const posts = data.filter(c => c.scope === 'posts').map(c => ({ label: c.name, href: `/community/browse/${c.slug}` }));
      if (svcs.length)  setServiceChildren(svcs);
      if (res.length)   setResourceChildren(res);
      if (posts.length) setCommunityChildren(posts);
    }
    fetchCategories();
  }, []);

  const NAV: NavSection[] = [
    { id: 'store',     label: 'Store',     href: '/',          icon: <IconStore />,     children: STORE_CHILDREN },
    { id: 'services',  label: 'Services',  href: '/services',  icon: <IconServices />,  children: serviceChildren },
    { id: 'resources', label: 'Resources', href: '/resources', icon: <IconResources />, children: resourceChildren },
    { id: 'community', label: 'Community', href: '/community', icon: <IconCommunity />, children: communityChildren },
    ...(user ? [{ id: 'collection', label: 'Collection', href: '/collection', icon: <IconCollection />, children: [] }] : []),
  ];

  function handleSectionClick(section: NavSection) {
    setOpenId(section.id);
    router.push(section.href);
  }

  const studioActive  = pathname.startsWith('/studio');
  const accountActive = pathname.startsWith('/account');
  const settingsActive = pathname.startsWith('/settings');
  const loginActive = pathname.startsWith('/login');

  return (
    <aside className="app-sidebar">
      <Link href="/" className="sidebar-logo" aria-label="44 Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/44icon.svg" alt="44" width={30} height={30} />
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV.map(section => {
          const isOpen   = openId === section.id;
          const isActive = activeSectionId === section.id;

          return (
            <div key={section.id} className="sidebar-section">
              <button
                className={isActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
                onClick={() => handleSectionClick(section)}
                aria-expanded={isOpen}
              >
                <span className="sidebar-item-icon">{section.icon}</span>
                <span className="sidebar-item-label">{section.label}</span>
              </button>

              {isOpen && section.children.length > 0 && (
                <div className="sidebar-children">
                  {section.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={isChildActive(child.href, pathname, search) ? 'sidebar-child sidebar-child-active' : 'sidebar-child'}
                    >
                      {child.icon && <span className="sidebar-child-icon">{child.icon}</span>}
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <Link href="/studio" className={studioActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconStudio /></span>
              <span className="sidebar-item-label">Studio</span>
            </Link>
            <Link href="/account" className={accountActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconAccount /></span>
              <span className="sidebar-item-label">Account</span>
            </Link>
            <Link href="/settings" className={settingsActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconSettings /></span>
              <span className="sidebar-item-label">Settings</span>
            </Link>
          </>
        ) : (
          <Link href="/login" className={loginActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
            <span className="sidebar-item-icon"><IconAccount /></span>
            <span className="sidebar-item-label">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
