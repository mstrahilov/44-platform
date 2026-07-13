type ExternalLink = { id: string; label: string; platform: string; url: string };

export function ExternalLinkActions({ links, context, label }: {
  links: ExternalLink[];
  context: 'profile' | 'item';
  label: string;
}) {
  if (links.length === 0) return null;
  return (
    <nav className={`external-link-actions-list external-link-actions-list-${context}`} aria-label={label}>
      {links.map(link => {
        const platformLabel = link.label || link.platform;
        const accessibleLabel = context === 'item'
          ? `Open this release on ${platformLabel}`
          : link.platform === 'website' ? 'Visit creator website' : `Visit creator on ${platformLabel}`;
        return (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" title={platformLabel} className={`${context === 'profile' ? 'external-profile-icon-link' : 'os-pill os-type-pill'} external-link-action`} aria-label={`${accessibleLabel} (opens in a new tab)`}>
            {context === 'profile' ? <PlatformIcon platform={link.platform} /> : <>
              <span>{platformLabel}</span>
              <span className="external-link-action-icon" aria-hidden="true">↗</span>
            </>}
          </a>
        );
      })}
    </nav>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'spotify') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M6.7 9.2c3.8-1.1 7.7-.7 10.8.9M7.5 12.4c3.2-.8 6.6-.5 9.2.8M8.2 15.4c2.6-.6 5.3-.3 7.5.7" fill="none" stroke="var(--os-color-surface, #111)" strokeWidth="1.45" strokeLinecap="round" /></svg>;
  if (platform === 'apple_music') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" /><path d="M15.8 6.6v9.1a2.3 2.3 0 1 1-1.3-2.1V8.4l-5.2 1.1v7.2A2.3 2.3 0 1 1 8 14.6V8.2l7.8-1.6Z" fill="var(--os-color-surface, #111)" /></svg>;
  if (platform === 'bandcamp') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 6.3h14.1l-4.6 11.4H2.6L7.2 6.3Z" fill="currentColor" /></svg>;
  if (platform === 'youtube') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 7.1c-.2-1-1-1.8-2-2C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5c-1 .2-1.8 1-2 2C2 8.8 2 12 2 12s0 3.2.5 4.9c.2 1 1 1.8 2 2 1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5c1-.2 1.8-1 2-2 .5-1.7.5-4.9.5-4.9s0-3.2-.5-4.9Z" fill="currentColor" /><path d="m10 15.2 5.2-3.2L10 8.8v6.4Z" fill="var(--os-color-surface, #111)" /></svg>;
  if (platform === 'instagram') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.7" r="1.2" fill="currentColor" /></svg>;
  if (platform === 'x') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.3 4h4.6l3.8 5.1L17.1 4h2.5l-5.8 6.9L20 20h-4.6l-4.2-5.7L6.4 20H3.9l6.1-7.5L4.3 4Zm3.4 2 8.7 12h1.9L9.6 6H7.7Z" fill="currentColor" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 12h17M12 3c2.4 2.5 3.7 5.5 3.7 9s-1.3 6.5-3.7 9c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
