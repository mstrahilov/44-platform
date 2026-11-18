'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SocialAvatar } from '@/components/Social';
import { AuthExperience } from '@/components/AuthExperience';
import { PageShell } from '@/components/Ui';
import { loadAccountOverview, type AccountOverview } from '@/lib/domain/accountOverview';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { OS44Button } from '@/components/OS44Button';

type YouLink = {
  href: string;
  label: string;
  description: string;
  icon: 'profile' | 'inbox' | 'studio' | 'support' | 'admin';
};

function AccountIcon({ name }: { name: YouLink['icon'] }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" {...shared}>
      {name === 'profile' && <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.5-3.7 3.2-5.8 7.5-5.8s7 2.1 7.5 5.8" /></>}
      {name === 'inbox' && <><path d="M8 11.5h8M8 15h5" /><path d="M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5.5 3v-3h-1.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" /><path d="M6.5 3h13a2 2 0 0 1 2 2" /></>}
      {name === 'studio' && <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>}
      {name === 'support' && <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 1 1 4.1 2.1c-.8.6-1.4 1.1-1.4 2.2" /><path d="M12.2 17.2h.01" /></>}
      {name === 'admin' && <><path d="M11 3a9 9 0 1 0 10 10H11V3Z" /><path d="M15 3.7a8 8 0 0 1 5.3 5.3H15V3.7Z" /></>}
    </svg>
  );
}

const INITIAL_STATE: AccountOverview = {
  profile: null,
  hasOrders: false,
};

export function YouApp() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccountOverview>(INITIAL_STATE);
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
    void loadAccountOverview(userId).then(nextState => {
      if (!active) return;
      setState(nextState);
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

  const { profile } = state;
  const username = profile?.username || '';
  const displayName = profile?.display_name?.trim() || username || 'there';
  const profileHref = username ? `/profile/${username}` : '/profile';
  const links: YouLink[] = [
    {
      href: profileHref,
      label: 'Profile',
      description: 'View or edit your profile',
      icon: 'profile',
    },
    {
      href: '/inbox',
      label: 'Inbox',
      description: 'View or send messages',
      icon: 'inbox',
    },
    {
      href: '/studio',
      label: 'Studio',
      description: 'Publish and manage work',
      icon: 'studio',
    },
    ...(profile?.role === 'admin' ? [{
      href: '/admin',
      label: 'Admin',
      description: 'Manage people and releases',
      icon: 'admin' as const,
    }] : []),
    {
      href: '/support',
      label: 'Support',
      description: 'Get help with 44OS',
      icon: 'support',
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
          {links.map(link => {
            const content = <>
              <span className="you-navigation-icon" aria-hidden="true"><AccountIcon name={link.icon} /></span>
              <span className="you-navigation-copy">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </span>
              <span className="you-navigation-chevron" aria-hidden="true">›</span>
            </>;

            return (
              <Link key={link.href} href={link.href} className="you-navigation-row ui44-list-row ui44-list-row-interactive">
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="you-logout-action">
          <OS44Button type="button" className="os-button os-button-ghost" onClick={() => void handleSignOut()}>Log Out</OS44Button>
        </div>
      </main>
    </PageShell>
  );
}
