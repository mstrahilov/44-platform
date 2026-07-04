'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { authorHandle } from '@/lib/social';
import type { Profile } from '@/lib/platform';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { useCommunityTopbarTabs } from '@/components/CommunityTopbarTabs';

export default function CommunityProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);

  useCommunityTopbarTabs('profile');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecking(false);
      return;
    }

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      const profile = (data as Profile | null) ?? null;
      const handle = authorHandle(profile);
      router.replace(handle ? `/community/profile/${handle}` : '/community/profile/edit');
    }

    loadProfile();
  }, [loading, router, user]);

  if (loading || checking) {
    return <PageShell><CenteredMessage>Loading profile...</CenteredMessage></PageShell>;
  }

  return (
    <PageShell>
      <CenteredMessage>
        Sign in to view your community profile.
        <div style={{ marginTop: 18 }}>
          <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
        </div>
      </CenteredMessage>
    </PageShell>
  );
}
