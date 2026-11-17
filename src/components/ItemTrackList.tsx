'use client';

import { useState, type MouseEvent } from 'react';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';

export type ItemTrackAction = {
  id: string;
  label: string;
  onSelect?: () => void;
  href?: string;
  download?: boolean;
  disabled?: boolean;
};

export type ItemTrackRow = {
  id: string;
  number: number;
  title: string;
  playable: boolean;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  actions: ItemTrackAction[];
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
};

/** Shared flat row layout for catalog releases, saved music and sample packs. */
export function ItemTrackList({ rows, label }: { rows: ItemTrackRow[]; label: string }) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return <div className="view-tracklist ui44-flat-track-list" aria-label={label} style={{ display: 'grid', overflow: 'visible', border: 0, borderRadius: 0, background: 'transparent', boxShadow: 'none' }}>
    {rows.map(row => <div
      className={`view-track-row ui44-track-row ui44-track-row-interactive${row.active ? ' view-track-row-selected ui44-track-row-selected' : ''}`}
      style={{ display: 'grid', gridTemplateColumns: 'var(--ui44-item-track-leading, 38px) minmax(0, 1fr) 40px', gap: 4, minHeight: 54, padding: 0, border: 0, borderRadius: 0, background: 'transparent', boxShadow: 'none', position: 'relative' }}
      key={row.id}
      role="button"
      tabIndex={row.playable ? 0 : -1}
      aria-disabled={!row.playable}
      aria-pressed={row.active}
      onClick={row.onPlay}
      onContextMenu={row.onContextMenu}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (row.playable) row.onPlay();
        }
      }}
    >
      <div className={row.active ? 'view-track-leading view-track-leading-current ui44-track-leading' : 'view-track-leading ui44-track-leading'}>
        <span className="view-track-number ui44-track-index">{row.number}</span>
        <button
          type="button"
          className="view-track-play ui44-track-play-action"
          disabled={!row.playable}
          aria-label={`${row.active && row.playing ? 'Pause' : 'Play'} ${row.title}`}
          onClick={event => { event.stopPropagation(); row.onPlay(); }}
        >
          <span className={row.active ? (row.playing ? 'view-track-icon view-track-icon-equalizer view-track-icon-equalizer-playing' : 'view-track-icon view-track-icon-pause') : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
        </button>
      </div>
      <Ui44OverflowTrackTitle title={row.title} active={row.active && row.playing} className="ui44-track-title" />
      <button
        type="button"
        className="view-track-more"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: 40, minWidth: 40, height: 44, padding: 0, border: 0, background: 'transparent', color: 'inherit' }}
        aria-label={`More actions for ${row.title}`}
        aria-expanded={openMenuId === row.id}
        onClick={event => { event.stopPropagation(); setOpenMenuId(current => current === row.id ? null : row.id); }}
      ><span aria-hidden="true">•••</span></button>
      {openMenuId === row.id ? <div className="ui44-paper-menu view-track-more-menu" role="menu" aria-label={`${row.title} actions`} style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 70 }} onClick={event => event.stopPropagation()}>
        {row.actions.map(action => action.href ? <a
          className="ui44-paper-menu-item"
          key={action.id}
          role="menuitem"
          href={action.href}
          target="_blank"
          rel="noreferrer"
          download={action.download || undefined}
          onClick={() => setOpenMenuId(null)}
        >{action.label}</a> : <button
          className="ui44-paper-menu-item"
          key={action.id}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          onClick={() => { setOpenMenuId(null); action.onSelect?.(); }}
        >{action.label}</button>)}
      </div> : null}
    </div>)}
  </div>;
}
