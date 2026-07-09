'use client';

/**
 * System-level shell behaviors that live once in the root layout:
 *
 * 1. LandingRedirect — kept for explicit post-login landings only.
 *    The root domain now renders the Home experience directly at `/`,
 *    so the shell should not visibly replace `/` with `/store`.
 *
 * 2. ContextMenuGuard — suppresses the browser context menu inside the
 *    shell so 44OS context menus can own right-click. Editable elements
 *    (inputs, textareas, contenteditable) keep the native menu.
 */

import { useEffect } from 'react';

export default function SystemShell() {
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
