'use client';

import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export type StudioReleasePickerItem = {
  id: string;
  title: string;
  cover_url: string | null;
  item_type?: string | null;
  experience_type?: string | null;
};

type StudioReleasePickerProps = {
  releases: StudioReleasePickerItem[];
  selectedId?: string;
  onSelect: (release: StudioReleasePickerItem) => void;
  onClose: () => void;
  title?: string;
};

/** Artwork-first release picker shared by Studio video attachment flows. */
export function StudioReleasePicker({
  releases,
  selectedId = '',
  onSelect,
  onClose,
  title = 'Select Release',
}: StudioReleasePickerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="studio-video-drawer-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="studio-video-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="studio-video-drawer-header">
          <button type="button" className="studio-video-drawer-close" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
          <h2>{title}</h2>
          <span className="studio-video-drawer-header-action" aria-hidden="true" />
        </header>
        {releases.length ? (
          <div className="studio-video-picker-list studio-release-picker-list">
            {releases.map(release => (
              <button
                type="button"
                className={`studio-video-picker-row studio-release-picker-row${selectedId === release.id ? ' studio-related-item-picker-selected' : ''}`}
                key={release.id}
                onClick={() => onSelect(release)}
              >
                {release.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={release.cover_url} alt="" />
                ) : (
                  <span className="studio-related-item-picker-artwork" aria-hidden="true">44</span>
                )}
                <span className="studio-related-item-picker-copy">
                  <strong>{release.title}</strong>
                  <small>{release.item_type || release.experience_type || 'Release'}</small>
                </span>
                {selectedId === release.id ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="dashboard-form-note studio-video-picker-empty">Publish a release first, then you can attach this video.</p>
        )}
      </section>
    </div>,
    document.body
  );
}
