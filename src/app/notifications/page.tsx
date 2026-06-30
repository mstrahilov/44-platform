import { PageShell } from '@/components/Ui';

export default function NotificationsPage() {
  return (
    <PageShell>
      <style>{`
        .placeholder-page { display: flex; flex-direction: column; gap: 24px; }
        .placeholder-header { display: flex; flex-direction: column; gap: 8px; }
        .placeholder-grid { display: grid; gap: 12px; }
        .placeholder-item {
          padding: 16px 20px;
          border-radius: 12px;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          display: flex; align-items: center; gap: 14px;
        }
        .placeholder-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--os-color-accent); flex-shrink: 0;
        }
        .placeholder-dot.read { background: rgba(255,255,255,0.2); }
        .placeholder-text { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .placeholder-title { font-size: 14px; font-weight: 500; color: var(--os-color-ink); }
        .placeholder-meta { font-size: 12px; color: var(--os-color-ink-muted); }
      `}</style>
      <div className="placeholder-page">
        <div className="placeholder-header">
          <h1 className="os-type-display">Notifications</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Stay up to date with activity across 44.</p>
        </div>
        <div className="placeholder-grid">
          {[
            { text: 'Your track "Midnight Drive" was purchased', time: '2 min ago', read: false },
            { text: 'New comment on your service listing', time: '14 min ago', read: false },
            { text: 'You have a new follower: Marcus_Creates', time: '1 hr ago', read: false },
            { text: 'Your resource guide was featured', time: '3 hrs ago', read: true },
            { text: 'Collaboration request from SoundWave Studio', time: '5 hrs ago', read: true },
            { text: 'Achievement unlocked: First Sale 🎉', time: 'Yesterday', read: true },
          ].map((n, i) => (
            <div key={i} className="placeholder-item">
              <div className={`placeholder-dot${n.read ? ' read' : ''}`} />
              <div className="placeholder-text">
                <div className="placeholder-title">{n.text}</div>
                <div className="placeholder-meta">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
