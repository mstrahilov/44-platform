'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';

type CreatorRequestStatus = 'pending' | 'approved' | 'rejected' | null;

const MEMBER_GUIDE = [
  {
    eyebrow: 'DISCOVER',
    title: 'Find work worth keeping.',
    copy: 'Explore releases and creative work, then add the things you care about to your Library.',
  },
  {
    eyebrow: 'YOUR SPACE',
    title: 'Make your profile yours.',
    copy: 'Add a picture, a short bio, and links so people know who they are meeting.',
  },
  {
    eyebrow: 'COMMUNITY',
    title: 'Follow the people behind it.',
    copy: 'Follow creators, join conversations, ask questions, and find people to work with.',
  },
] as const;

const CREATOR_GUIDE = [
  {
    eyebrow: 'YOUR PROFILE',
    title: 'Build the public version of you.',
    copy: 'Add a clear image, concise bio, and the platform links you want people to visit.',
  },
  {
    eyebrow: 'YOUR WORK',
    title: 'Prepare everything in one place.',
    copy: 'Approved Creators can add Music, Books, Games, Beats, Sample Packs, Events, and Updates through Studio. Releases can also point to the places they live elsewhere.',
  },
  {
    eyebrow: 'YOUR PEOPLE',
    title: 'Discovery continues after upload.',
    copy: 'Library saves intent. Following brings your newest work forward. Community gives every release somewhere to keep living.',
  },
] as const;

export default function WelcomeApp() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [requestStatus, setRequestStatus] = useState<CreatorRequestStatus>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (authLoading) return () => { alive = false; };
    if (!user) {
      Promise.resolve().then(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }

    void Promise.all([
      loadStudioProfile(user.id),
      supabase
        .from('creator_access_requests' as never)
        .select('status')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ]).then(([profileResult, requestResult]) => {
      if (!alive) return;
      setProfile(profileResult.profile);
      const request = requestResult.data as unknown as { status?: CreatorRequestStatus } | null;
      setRequestStatus(request?.status ?? null);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
    });

    return () => { alive = false; };
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <PageShell><main className="welcome-page"><div className="ui44-loading-shell" role="status" aria-label="Loading welcome" /></main></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="welcome-page welcome-page-signed-out">
          <p className="welcome-eyebrow">WELCOME</p>
          <h1>Start with an account.</h1>
          <p>Log in or create an account to set up your profile and personal 44 experience.</p>
          <Link className="os-button os-button-primary" href="/login">Get started</Link>
        </main>
      </PageShell>
    );
  }

  const approvedCreator = profile?.role === 'creator' || profile?.role === 'admin' || requestStatus === 'approved';
  const creatorJourney = approvedCreator || requestStatus !== null;
  const guide = creatorJourney ? CREATOR_GUIDE : MEMBER_GUIDE;
  const displayName = profile?.display_name?.trim() || user.user_metadata?.display_name || 'there';
  const creatorStatus = approvedCreator
    ? 'Creator access is active.'
    : requestStatus === 'rejected'
      ? 'Creator publishing is not active. Your Member profile remains available.'
      : 'Creator setup is open. Publishing remains locked until 44 completes its review.';

  return (
    <PageShell>
      <main className="welcome-page">
        <header className="welcome-hero">
          <p className="welcome-eyebrow">WELCOME TO 44</p>
          <h1>{creatorJourney ? `Set up your space, ${displayName}.` : `Make yourself at home, ${displayName}.`}</h1>
          <p className="welcome-intro">
            {creatorJourney
              ? 'Your profile can take shape now. Keep it clear, put your work in context, and let people know where else to find you.'
              : '44 is a place to discover independent work, keep a Library that follows you, and meet the people who made it.'}
          </p>
          {creatorJourney && <p className="welcome-status">{creatorStatus}</p>}
          <div className="welcome-actions">
            <Link className="os-button os-button-primary" href="/profile/edit">Update profile</Link>
            {approvedCreator
              ? <Link className="os-button os-button-secondary" href="/studio">Open Studio</Link>
              : <Link className="os-button os-button-secondary" href="/">Explore Discover</Link>}
          </div>
        </header>

        <section className="welcome-guide" aria-label={creatorJourney ? 'Creator introduction' : 'Member introduction'}>
          {guide.map(item => (
            <article className="welcome-guide-item" key={item.eyebrow}>
              <p className="welcome-eyebrow">{item.eyebrow}</p>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>

        <aside className="welcome-desktop-note">
          <div>
            <p className="welcome-eyebrow">ON DESKTOP</p>
            <h2>Right-click when you want the quicker route.</h2>
            <p>Items expose useful actions without making you leave the page. The Sidebar also has its own compact and customization controls.</p>
          </div>
          <Link href="/" className="welcome-text-link">Continue to Discover →</Link>
        </aside>
      </main>
    </PageShell>
  );
}
