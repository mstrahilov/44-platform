import { PageShell } from '@/components/Ui';

export default function MessagesPage() {
  return (
    <PageShell>
      <style>{`
        .placeholder-page { display: flex; flex-direction: column; gap: 24px; }
        .placeholder-header { display: flex; flex-direction: column; gap: 8px; }
        .placeholder-grid { display: grid; gap: 8px; }
        .msg-item {
          padding: 14px 18px;
          border-radius: 12px;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          display: flex; align-items: center; gap: 14px; cursor: pointer;
          text-decoration: none; color: inherit;
          transition: background 120ms;
        }
        .msg-item:hover { background: rgba(255,255,255,0.10); }
        .msg-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .msg-body { flex: 1; min-width: 0; }
        .msg-name { font-size: 14px; font-weight: 600; color: var(--os-color-ink); }
        .msg-preview { font-size: 12px; color: var(--os-color-ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .msg-time { font-size: 11px; color: var(--os-color-ink-muted); flex-shrink: 0; }
      `}</style>
      <div className="placeholder-page">
        <div className="placeholder-header">
          <h1 className="os-type-display">Messages</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Direct messages and group conversations.</p>
        </div>
        <div className="placeholder-grid">
          {[
            { name: 'Marcus Creates', preview: 'Hey, loved your latest track!', time: '2m', initial: 'M' },
            { name: 'SoundWave Studio', preview: 'Are you open for a collab on...', time: '1h', initial: 'S' },
            { name: 'Lunar Visual', preview: 'Sent you a project file', time: '3h', initial: 'L' },
            { name: 'Aria Beats', preview: 'Thanks for the feedback 🙏', time: 'Yesterday', initial: 'A' },
            { name: 'Design Collective', preview: 'Miro: Sounds good to me!', time: '2d', initial: 'D' },
          ].map((m, i) => (
            <div key={i} className="msg-item">
              <div className="msg-avatar">{m.initial}</div>
              <div className="msg-body">
                <div className="msg-name">{m.name}</div>
                <div className="msg-preview">{m.preview}</div>
              </div>
              <div className="msg-time">{m.time}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
