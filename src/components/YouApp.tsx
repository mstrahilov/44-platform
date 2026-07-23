'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SocialAvatar } from '@/components/Social';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { hasCustomerOrders } from '@/lib/domain/customerCommerce';
import { fetchMyTeamAccess } from '@/lib/domain/team';
import { supabase } from '@/lib/supabase';
import {
  isCreatorProfile,
  loadStudioProfile,
  type StudioProfile,
} from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';

type YouState = {
  profile: StudioProfile | null;
  hasOrders: boolean;
  hasTeamAccess: boolean;
};

type YouLink = {
  href: string;
  label: string;
  description: string;
  iconClass: string;
};

const INITIAL_STATE: YouState = {
  profile: null,
  hasOrders: false,
  hasTeamAccess: false,
};

export function YouApp() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<YouState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      Promise.resolve().then(() => {
        setState(INITIAL_STATE);
        setLoading(false);
      });
      return;
    }

    let active = true;
    const userId = user.id;
    void Promise.all([
      loadStudioProfile(userId).then(result => result.profile).catch(() => null),
      hasCustomerOrders(userId).catch(() => false),
      fetchMyTeamAccess().then(result => result.authorized).catch(() => false),
    ]).then(([profile, hasOrders, hasTeamAccess]) => {
      if (!active) return;
      setState({ profile, hasOrders, hasTeamAccess });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading Account" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page you-page">
          <HubHero title="Account" />
          <EmptyMessage>Log in to open your profile, messages, Library tools, and account settings.</EmptyMessage>
          <div className="ui44-centered-action">
            <Link href="/login" className="os-button os-button-primary">Log In</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  const { profile, hasOrders, hasTeamAccess } = state;
  const username = profile?.username || '';
  const displayName = profile?.display_name?.trim() || username || 'there';
  const profileHref = username ? `/profile/${username}` : '/profile';
  const links: YouLink[] = [
    {
      href: profileHref,
      label: 'Profile',
      description: 'View or edit your profile',
      iconClass: 'os-icon-user',
    },
    {
      href: '/notifications',
      label: 'Notifications',
      description: 'View or edit notifications',
      iconClass: 'os-icon-notifications',
    },
    {
      href: '/inbox',
      label: 'Messages',
      description: 'View or send messages',
      iconClass: 'os-icon-inbox',
    },
    ...(hasOrders ? [{
      href: '/orders',
      label: 'Orders',
      description: 'View purchases and orders',
      iconClass: 'os-icon-orders',
    }] : []),
    ...(isCreatorProfile(profile) ? [{
      href: '/studio',
      label: 'Studio',
      description: 'Publish and manage work',
      iconClass: 'os-icon-studio-disc',
    }] : []),
    ...(hasTeamAccess ? [{
      href: '/team',
      label: 'Team',
      description: 'Open Team resources',
      iconClass: 'os-icon-friends',
    }] : []),
    {
      href: '/support',
      label: 'Support',
      description: 'Get help with 44OS',
      iconClass: 'os-icon-support',
    },
    {
      href: '/settings',
      label: 'Settings',
      description: 'Manage account and app',
      iconClass: 'os-icon-settings',
    },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <PageShell>
      <main className="dashboard-page you-page">
        <HubHero title={`Welcome, ${displayName}`} className="you-greeting" />
        <section className="you-mobile-identity" aria-label={displayName}>
          <Link href={profileHref} className="you-mobile-avatar-link" aria-label={`Open ${displayName}'s profile`}>
            <SocialAvatar profile={profile} />
          </Link>
          <h1>{displayName}</h1>
        </section>
        <nav className="you-navigation ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip" aria-label="Account">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="you-navigation-row ui44-list-row ui44-list-row-interactive">
              <span className={`you-navigation-icon os-icon ${link.iconClass}`} aria-hidden="true" />
              <span className="you-navigation-copy">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </span>
              <span className="you-navigation-chevron" aria-hidden="true">›</span>
            </Link>
          ))}
          <button type="button" className="you-navigation-row you-navigation-logout ui44-list-row ui44-list-row-interactive" onClick={() => void handleSignOut()}>
            <svg className="you-navigation-icon you-navigation-signout" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
              <path d="m16 16 4-4-4-4M20 12H9" />
            </svg>
            <span className="you-navigation-copy">
              <strong>Log Out</strong>
              <span className="you-navigation-logout-description">End this session</span>
            </span>
          </button>
        </nav>
      </main>
    </PageShell>
  );
}
