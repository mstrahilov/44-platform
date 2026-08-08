'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SocialAvatar } from '@/components/Social';
import { AuthExperience } from '@/components/AuthExperience';
import { PageShell } from '@/components/Ui';
import { hasCustomerOrders } from '@/lib/domain/customerCommerce';
import { supabase } from '@/lib/supabase';
import {
  isCreatorProfile,
  loadStudioProfile,
  type StudioProfile,
} from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';
import { fetchMyTeamAccess } from '@/lib/domain/team';

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
        <main className="login-page login-page-account page-scroll">
          <AuthExperience variant="account" authenticatedDestination={null} />
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
    ...(isCreatorProfile(profile) ? [{
      href: '/studio',
      label: 'Studio',
      description: 'Publish and manage work',
      iconClass: 'os-icon-studio-disc',
    }] : []),
    ...(hasOrders ? [{
      href: '/orders',
      label: 'Orders',
      description: 'View purchases and orders',
      iconClass: 'os-icon-orders',
    }] : []),
    {
      href: '/inbox',
      label: 'Messages',
      description: 'View or send messages',
      iconClass: 'os-icon-inbox',
    },
    ...(profile?.role === 'admin' ? [{
      href: '/admin',
      label: 'Admin',
      description: 'Manage people, content, and operations',
      iconClass: 'os-icon-dashboard',
    }] : hasTeamAccess ? [{
      href: '/team',
      label: 'Team',
      description: 'Open the private Team workspace',
      iconClass: 'os-icon-friends',
    }] : []),
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
        </nav>
        <div className="you-logout-action">
          <button type="button" className="os-button os-button-ghost" onClick={() => void handleSignOut()}>Log Out</button>
        </div>
      </main>
    </PageShell>
  );
}
