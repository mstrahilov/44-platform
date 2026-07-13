'use client';

import type { ExternalLinkDraft, ExternalLinkPlatform } from '@/lib/domain/externalLinks';

export function ExternalLinksEditor({ links, platforms, onChange, description }: {
  links: ExternalLinkDraft[];
  platforms: ExternalLinkPlatform[];
  onChange: (links: ExternalLinkDraft[]) => void;
  description?: string;
}) {
  function update(index: number, patch: Partial<ExternalLinkDraft>) {
    onChange(links.map((link, linkIndex) => linkIndex === index ? { ...link, ...patch } : link));
  }

  return (
    <div className="external-links-editor">
      {description && <div className="external-links-editor-head">
        <p className="dashboard-form-note">{description}</p>
      </div>}
      <div className="external-links-list">
          {links.map((link, index) => {
            const selectedPlatform = platforms.find(platform => platform.key === link.platform);
            return (
              <div className="external-link-row" key={`${link.platform}-${index}`}>
                <label className="profile-edit-field dashboard-field external-link-url-field">
                  <span className="profile-edit-label external-link-service-name">{selectedPlatform?.label ?? link.platform}</span>
                  <input className="profile-edit-input os-input-field" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={link.url} onChange={event => update(index, { url: event.target.value })} />
                </label>
              </div>
            );
          })}
      </div>
    </div>
  );
}
