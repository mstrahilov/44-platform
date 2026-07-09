'use client';

/**
 * The 44OS context menu — the shared right-click primitive (44OS_UI.md §14).
 * Right-click is reserved shell-wide by SystemShell; surfaces opt in by
 * calling `openContextMenu(event, entries)` from an onContextMenu handler.
 * One menu is open at a time; it closes on outside press, Escape, scroll,
 * resize, or route change. Rendered in the `.os-popover` language.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export const COPY_TO_CLIPBOARD_TOAST_EVENT = '44:copy-to-clipboard-toast';

export type ContextMenuEntry =
  | {
      kind?: 'item';
      id: string;
      label: string;
      href?: string;
      onSelect?: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | { kind: 'divider'; id: string };

type MenuState = { x: number; y: number; entries: ContextMenuEntry[] };

type ContextMenuValue = {
  openContextMenu: (
    event: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number },
    entries: ContextMenuEntry[],
  ) => void;
  closeContextMenu: () => void;
  showCopiedToast: (message?: string) => void;
};

const ContextMenuContext = createContext<ContextMenuValue | null>(null);

export function useContextMenu(): ContextMenuValue {
  const value = useContext(ContextMenuContext);
  if (!value) throw new Error('useContextMenu must be used inside ContextMenuProvider');
  return value;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [copiedToast, setCopiedToast] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const closeContextMenu = useCallback(() => setMenu(null), []);
  const showCopiedToast = useCallback((message = 'Link copied to clipboard') => {
    setCopiedToast(message);
  }, []);

  const openContextMenu = useCallback<ContextMenuValue['openContextMenu']>((event, entries) => {
    event.preventDefault();
    event.stopPropagation();
    if (entries.length === 0) return;
    setMenu({ x: event.clientX, y: event.clientY, entries });
  }, []);

  // Route change closes the menu.
  useEffect(() => {
    Promise.resolve().then(() => setMenu(null));
  }, [pathname]);

  // Outside press, Escape, scroll, and resize close the menu.
  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(null);
    }
    function onScroll(event: Event) {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) return;
      setMenu(null);
    }
    function onResize() { setMenu(null); }
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [menu]);

  // Clamp the menu inside the viewport once it has a measured size.
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 10;
    let { x, y } = menu;
    if (x + rect.width > window.innerWidth - margin) x = Math.max(margin, window.innerWidth - rect.width - margin);
    if (y + rect.height > window.innerHeight - margin) y = Math.max(margin, window.innerHeight - rect.height - margin);
    if (x !== menu.x || y !== menu.y) setMenu(current => (current ? { ...current, x, y } : current));
  }, [menu]);

  useEffect(() => {
    if (!copiedToast) return;
    const timeout = window.setTimeout(() => setCopiedToast(''), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedToast]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showCopiedToast(detail?.message);
    }
    window.addEventListener(COPY_TO_CLIPBOARD_TOAST_EVENT, onToast);
    return () => window.removeEventListener(COPY_TO_CLIPBOARD_TOAST_EVENT, onToast);
  }, [showCopiedToast]);

  return (
    <ContextMenuContext.Provider value={{ openContextMenu, closeContextMenu, showCopiedToast }}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          className="os-popover os-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onContextMenu={event => event.preventDefault()}
        >
          {menu.entries.map(entry =>
            entry.kind === 'divider' ? (
              <div key={entry.id} className="os-popover-divider" />
            ) : entry.href && !entry.disabled ? (
              <Link
                key={entry.id}
                href={entry.href}
                role="menuitem"
                className={entry.danger ? 'os-popover-item os-popover-item-danger' : 'os-popover-item'}
                onClick={() => { entry.onSelect?.(); setMenu(null); }}
              >
                {entry.label}
              </Link>
            ) : (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                className={entry.danger ? 'os-popover-item os-popover-item-danger' : 'os-popover-item'}
                disabled={entry.disabled}
                onClick={() => { entry.onSelect?.(); setMenu(null); }}
              >
                {entry.label}
              </button>
            ),
          )}
        </div>
      )}
      {copiedToast && (
        <div className="os-popover os-copy-toast" role="status" aria-live="polite">
          {copiedToast}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
}
