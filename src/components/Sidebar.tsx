'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

type NavSection = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

/* ── SF Symbol-inspired outline icons, 22px, weight 1.7 ── */
const IconStore = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5L4.5 3.5h13L19 8.5"/>
    <path d="M3 8.5V18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5"/>
    <path d="M3 8.5a2.5 2.5 0 0 0 5 0"/>
    <path d="M8 8.5a2.5 2.5 0 0 0 5 0"/>
    <path d="M13 8.5a2.5 2.5 0 0 0 5 0"/>
  </svg>
);

const IconServices = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L5 12h5l-1 7 7-9h-5l1-7z"/>
  </svg>
);

const IconResources = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
    <path d="M12 3v4h4"/>
    <line x1="7.5" y1="12" x2="14.5" y2="12"/>
    <line x1="7.5" y1="15.5" x2="12" y2="15.5"/>
  </svg>
);

const IconCommunity = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3H5a1.5 1.5 0 0 0-1.5 1.5V13A1.5 1.5 0 0 0 5 14.5h3.5L11 18l2.5-3.5H17a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 17 3z"/>
  </svg>
);

const IconCollection = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="4" height="15" rx="1"/>
    <rect x="9" y="5" width="4" height="13.5" rx="1"/>
    <path d="M15 6l4 12.5"/>
  </svg>
);

const IconDashboard = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="12" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="12" width="7" height="7" rx="1.5"/>
    <rect x="12" y="12" width="7" height="7" rx="1.5"/>
  </svg>
);

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="3"/>
    <path d="M11 1.5v2M11 18.5v2M1.5 11h2M18.5 11h2M4.2 4.2l1.5 1.5M16.3 16.3l1.5 1.5M4.2 17.8l1.5-1.5M16.3 5.7l1.5-1.5"/>
  </svg>
);

function getActiveSectionId(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/store') || pathname.startsWith('/product')) return 'store';
  if (pathname.startsWith('/services') || pathname.startsWith('/service')) return 'services';
  if (pathname.startsWith('/resources')) return 'resources';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/collection')) return 'collection';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/studio')) return 'dashboard';
  if (pathname.startsWith('/settings')) return 'settings';
  return '';
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const now = useNow();
  const activeSectionId = getActiveSectionId(pathname);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    loadStudioProfile(user.id).then(r => setProfile(r.profile));
  }, [user]);

  const NAV: NavSection[] = [
    { id: 'store',     label: 'Store',     href: '/',          icon: <IconStore /> },
    { id: 'services',  label: 'Services',  href: '/services',  icon: <IconServices /> },
    { id: 'resources', label: 'Resources', href: '/resources', icon: <IconResources /> },
    { id: 'community', label: 'Community', href: '/community', icon: <IconCommunity /> },
  ];

  const settingsActive = pathname.startsWith('/settings');
  const time = now
    ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <Link href="/" className="sidebar-logo" aria-label="44 Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/44-logo-dark.svg" alt="44" width={36} height={36} className="sidebar-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/44-logo-light.svg" alt="44" width={36} height={36} className="sidebar-logo-light" />
        </Link>
        <span className="sidebar-clock" aria-live="polite">{time}</span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV.map(section => {
          const isActive = activeSectionId === section.id;
          return (
            <Link
              key={section.id}
              href={section.href}
              className={isActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
            >
              <span className="sidebar-item-icon">{section.icon}</span>
              <span className="sidebar-item-label">{section.label}</span>
            </Link>
          );
        })}

        {user && (
          <>
            <div className="sidebar-divider" />
            <Link
              href="/collection"
              className={activeSectionId === 'collection' ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
            >
              <span className="sidebar-item-icon"><IconCollection /></span>
              <span className="sidebar-item-label">Collection</span>
            </Link>
          </>
        )}

        <div className="sidebar-spacer" />

        {user && isCreatorProfile(profile) && (
          <Link
            href="/dashboard"
            className={activeSectionId === 'dashboard' ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
          >
            <span className="sidebar-item-icon"><IconDashboard /></span>
            <span className="sidebar-item-label">Dashboard</span>
          </Link>
        )}

        <div className="sidebar-divider" />

        <Link
          href="/settings"
          className={settingsActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
        >
          <span className="sidebar-item-icon"><IconSettings /></span>
          <span className="sidebar-item-label">Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
