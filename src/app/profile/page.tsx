'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    async function redirect() {
      const { profile } = await loadStudioProfile(user!.id);
      const username = profile?.username || user!.id.slice(0, 8);
      router.replace(`/community/profile/${username}`);
    }

    redirect();
  }, [loading, router, user]);

  return <div className="panel-scroll" />;
}
