'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

type DesktopMenuDestination = 'profile' | 'studio' | 'orders' | 'messages' | 'settings' | 'support';

export function DesktopMenuNavigation() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    async function navigate(destination: DesktopMenuDestination) {
      if (destination !== 'profile') {
        const routes: Record<Exclude<DesktopMenuDestination, 'profile'>, string> = {
          studio: '/studio',
          orders: '/orders',
          messages: '/messages',
          settings: '/settings',
          support: '/support',
        };
        router.push(routes[destination]);
        return;
      }

      if (!user) {
        router.push('/you');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      router.push(data?.username ? `/profile/${encodeURIComponent(data.username)}` : '/you');
    }

    function onDesktopMenu(event: Event) {
      const destination = (event as CustomEvent<DesktopMenuDestination>).detail;
      if (['profile', 'studio', 'orders', 'messages', 'settings', 'support'].includes(destination)) {
        void navigate(destination);
      }
    }

    window.addEventListener('44:desktop-menu', onDesktopMenu);
    return () => window.removeEventListener('44:desktop-menu', onDesktopMenu);
  }, [router, user]);

  return null;
}
