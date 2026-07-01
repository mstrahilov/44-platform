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

const IconProfile = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="6" r="3"/>
    <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
  </svg>
);

const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6l7 5 7-5"/>
    <rect x="2" y="3" width="14" height="12" rx="1.5"/>
  </svg>
);

const IconNotifications = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 6a4 4 0 0 0-8 0c0 5-2 6-2 6h12s-2-1-2-6"/>
    <path d="M7.5 15a1.5 1.5 0 0 0 3 0"/>
  </svg>
);

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="6" height="6" rx="1.5"/>
    <rect x="10" y="2" width="6" height="6" rx="1.5"/>
    <rect x="2" y="10" width="6" height="6" rx="1.5"/>
    <rect x="10" y="10" width="6" height="6" rx="1.5"/>
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="2.5"/>
    <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"/>
  </svg>
);

const IconSignIn = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 2H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"/>
    <path d="M11 12l4-3-4-3"/>
    <line x1="15" y1="9" x2="7" y2="9"/>
  </svg>
);

function getActiveSectionId(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/store')) return 'store';
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/resources')) return 'resources';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/collection')) return 'collection';
  return '';
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const activeSectionId = getActiveSectionId(pathname);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        return;
      }
      const result = await loadStudioProfile(user.id);
      setProfile(result.profile);
    }
    fetchProfile();
  }, [user]);

  const NAV: NavSection[] = [
    { id: 'store',     label: 'Store',     href: '/',          icon: <IconStore /> },
    { id: 'services',  label: 'Services',  href: '/services',  icon: <IconServices /> },
    { id: 'resources', label: 'Resources', href: '/resources', icon: <IconResources /> },
    { id: 'community', label: 'Community', href: '/community', icon: <IconCommunity /> },
    ...(user ? [{ id: 'collection', label: 'Collection', href: '/collection', icon: <IconCollection /> }] : []),
  ];

  const profileActive = pathname.startsWith('/community/profile') || pathname.startsWith('/profile');
  const inboxActive = pathname.startsWith('/inbox');
  const notificationsActive = pathname.startsWith('/notifications');
  const dashboardActive = pathname.startsWith('/dashboard') || pathname.startsWith('/studio');
  const settingsActive = pathname.startsWith('/settings');
  const loginActive = pathname.startsWith('/login');

  const profileHref = profile?.username ? `/community/profile/${profile.username}` : '/profile';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <Link href="/" className="sidebar-logo" aria-label="44 Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/44-logo-dark.svg" alt="44" width={30} height={30} className="sidebar-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/44-logo-light.svg" alt="44" width={30} height={30} className="sidebar-logo-light" />
        </Link>

        {user && (
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={notificationsActive ? 'sidebar-notification-button sidebar-notification-button-active' : 'sidebar-notification-button'}
          >
            <IconNotifications />
          </Link>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV.map(section => {
          const isActive = activeSectionId === section.id;

          return (
            <div key={section.id} className="sidebar-section">
              <Link
                href={section.href}
                className={isActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
              >
                <span className="sidebar-item-icon">{section.icon}</span>
                <span className="sidebar-item-label">{section.label}</span>
              </Link>
            </div>
          );
        })}

        {user && (
          <>
            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <Link href={profileHref} className={profileActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
                <span className="sidebar-item-icon"><IconProfile /></span>
                <span className="sidebar-item-label">Profile</span>
              </Link>
            </div>
            <div className="sidebar-section">
              <Link href="/inbox" className={inboxActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
                <span className="sidebar-item-icon"><IconInbox /></span>
                <span className="sidebar-item-label">Inbox</span>
              </Link>
            </div>
            {isCreatorProfile(profile) && (
              <div className="sidebar-section">
                <Link href="/dashboard" className={dashboardActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
                  <span className="sidebar-item-icon"><IconDashboard /></span>
                  <span className="sidebar-item-label">Dashboard</span>
                </Link>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <Link href="/settings" className={settingsActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconSettings /></span>
              <span className="sidebar-item-label">Settings</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/settings" className={settingsActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconSettings /></span>
              <span className="sidebar-item-label">Settings</span>
            </Link>
            <Link href="/login" className={loginActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}>
              <span className="sidebar-item-icon"><IconSignIn /></span>
              <span className="sidebar-item-label">Sign In</span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
