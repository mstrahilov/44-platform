'use client';

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';

export type PlaylistTrackAction = {
  id: string;
  label: string;
  onSelect?: () => void;
  href?: string;
  download?: boolean;
  disabled?: boolean;
};

export type PlaylistTrackListRow = {
  id: string;
  number: number;
  title: string;
  artist?: string;
  artistHref?: string;
  playable?: boolean;
  onPlay?: () => void;
  active?: boolean;
  playing?: boolean;
  actions: PlaylistTrackAction[];
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
};

export function PlaylistTrackList({ rows, label, className = '' }: { rows: PlaylistTrackListRow[]; label: string; className?: string }) {
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function closeMenu() { setOpenMenu(null); }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && (menuRef.current?.contains(target) || triggerRef.current?.contains(target))) return;
      closeMenu();
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [openMenu]);

  function handleRowKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, row: PlaylistTrackListRow) {
    if (!row.onPlay || row.playable === false || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    row.onPlay();
  }

  function toggleMenu(event: MouseEvent<HTMLButtonElement>, row: PlaylistTrackListRow) {
    event.stopPropagation();
    if (openMenu?.id === row.id) {
      setOpenMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = Math.min(row.actions.length * 44 + 16, window.innerHeight - 16);
    const menuWidth = Math.min(220, window.innerWidth - 16);
    const below = rect.bottom + 4;
    const top = below + menuHeight <= window.innerHeight - 8 ? below : Math.max(8, rect.top - menuHeight - 4);
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    triggerRef.current = event.currentTarget;
    setOpenMenu({ id: row.id, top, left });
  }

  const openRow = openMenu ? rows.find(row => row.id === openMenu.id) : undefined;

  return <div className={`playlist-track-list playlist-shared-track-list${className ? ` ${className}` : ''}`} aria-label={label}>
    {rows.map(row => {
      const canPlay = Boolean(row.onPlay) && row.playable !== false;
      return <div
        className={`playlist-track-row view-track-row ui44-track-row${row.active ? ' view-track-row-selected ui44-track-row-selected' : ''}${canPlay ? ' ui44-track-row-interactive' : ''}`}
        key={row.id}
        role={canPlay ? 'button' : undefined}
        tabIndex={canPlay ? 0 : undefined}
        aria-disabled={row.onPlay && !canPlay ? true : undefined}
        aria-pressed={canPlay ? Boolean(row.active) : undefined}
        onClick={canPlay ? row.onPlay : undefined}
        onContextMenu={row.onContextMenu}
        onKeyDown={event => handleRowKeyDown(event, row)}
      >
        <span className="view-track-number ui44-track-index">{row.number}</span>
        <span className="playlist-track-copy ui44-track-copy">
          <Ui44OverflowTrackTitle title={row.title} active={Boolean(row.active && row.playing)} className="ui44-track-title" />
          {row.artist ? <small className="ui44-track-subtitle">{row.artistHref ? <Link href={row.artistHref} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>{row.artist}</Link> : row.artist}</small> : null}
        </span>
        <button
          type="button"
          className="playlist-track-more view-track-more"
          aria-label={`More actions for ${row.title}`}
          aria-haspopup="menu"
          aria-expanded={openMenu?.id === row.id}
          onClick={event => toggleMenu(event, row)}
          onKeyDown={event => event.stopPropagation()}
        >•••</button>
      </div>;
    })}
    {openMenu && openRow && typeof document !== 'undefined' ? createPortal(<div
      ref={menuRef}
      className="ui44-paper-menu view-track-more-menu"
      role="menu"
      aria-label={`${openRow.title} actions`}
      style={{ position: 'fixed', top: openMenu.top, left: openMenu.left, right: 'auto', bottom: 'auto', zIndex: 1000, width: 'min(220px, calc(100vw - 16px))', maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto' }}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      {openRow.actions.map(action => action.href ? <a
        className="ui44-paper-menu-item"
        key={action.id}
        role="menuitem"
        href={action.href}
        target="_blank"
        rel="noreferrer"
        download={action.download || undefined}
        onClick={() => setOpenMenu(null)}
      >{action.label}</a> : <button
        className="ui44-paper-menu-item"
        key={action.id}
        type="button"
        role="menuitem"
        disabled={action.disabled}
        onClick={() => { setOpenMenu(null); action.onSelect?.(); }}
      >{action.label}</button>)}
    </div>, document.body) : null}
  </div>;
}
