'use client';

/**
 * System-level shell behaviors that live once in the root layout:
 *
 * 1. LandingRedirect — when a signed-in user opens 44OS at `/`, route them
 *    to their chosen landing app (Settings > System > Landing Page,
 *    default Home). Runs once per app load and never hijacks in-app
 *    navigation back to the Store.
 *
 * 2. ContextMenuGuard — suppresses the browser context menu inside the
 *    shell so 44OS context menus can own right-click. Editable elements
 *    (inputs, textareas, contenteditable) keep the native menu.
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { getLandingPageHref } from '@/lib/landingPage';

let landingHandled = false;

export default function SystemShell() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (landingHandled || loading) return;
    if (!user) { landingHandled = true; return; }
    landingHandled = true;
    if (pathname !== '/') return;
    const href = getLandingPageHref();
    if (href !== '/') router.replace(href);
  }, [user, loading, pathname, router]);

  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
      event.preventDefault();
    }
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  return null;
}
