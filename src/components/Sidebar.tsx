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
  iconClass: string;
};

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
    { id: 'store',     label: 'Store',     href: '/',          iconClass: 'os-icon-store' },
    { id: 'services',  label: 'Services',  href: '/services',  iconClass: 'os-icon-services' },
    { id: 'resources', label: 'Resources', href: '/resources', iconClass: 'os-icon-resources' },
    { id: 'community', label: 'Community', href: '/community', iconClass: 'os-icon-community' },
  ];

  const settingsActive = pathname.startsWith('/settings');
  const time = now
    ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <Link href="/" className="sidebar-logo" aria-label="44 Home">
          <span className="os-logo-44" aria-hidden="true" />
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
              <span className={`os-icon ${section.iconClass}`} aria-hidden="true" />
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
              <span className="os-icon os-icon-collection" aria-hidden="true" />
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
            <span className="os-icon os-icon-dashboard" aria-hidden="true" />
            <span className="sidebar-item-label">Dashboard</span>
          </Link>
        )}

        {!user && (
          <Link
            href="/login"
            className={pathname.startsWith('/login') ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
          >
            <span className="os-icon os-icon-user" aria-hidden="true" />
            <span className="sidebar-item-label">Log In</span>
          </Link>
        )}

        <div className="sidebar-divider" />

        <Link
          href="/settings"
          className={settingsActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
        >
          <span className="os-icon os-icon-settings" aria-hidden="true" />
          <span className="sidebar-item-label">Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
