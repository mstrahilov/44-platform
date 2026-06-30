import { PageShell } from '@/components/Ui';

export default function FriendsPage() {
  return (
    <PageShell>
      <style>{`
        .placeholder-page { display: flex; flex-direction: column; gap: 24px; }
        .placeholder-header { display: flex; flex-direction: column; gap: 8px; }
        .friends-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .friend-card {
          padding: 20px 16px;
          border-radius: 14px;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
        }
        .friend-avatar {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; color: #fff;
        }
        .friend-name { font-size: 14px; font-weight: 600; color: var(--os-color-ink); }
        .friend-meta { font-size: 12px; color: var(--os-color-ink-muted); }
        .friend-btn {
          padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500;
          background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.8); cursor: pointer; transition: background 120ms;
        }
        .friend-btn:hover { background: rgba(255,255,255,0.18); }
      `}</style>
      <div className="placeholder-page">
        <div className="placeholder-header">
          <h1 className="os-type-display">Friends</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Creators and collaborators you follow on 44.</p>
        </div>
        <div className="friends-grid">
          {[
            { name: 'Marcus Creates', role: 'Music Producer', initial: 'M' },
            { name: 'SoundWave Studio', role: 'Audio Engineer', initial: 'S' },
            { name: 'Lunar Visual', role: 'Motion Designer', initial: 'L' },
            { name: 'Aria Beats', role: 'Composer', initial: 'A' },
            { name: 'Neon Collective', role: 'Design Studio', initial: 'N' },
            { name: 'Felix Wright', role: 'Developer', initial: 'F' },
          ].map((f, i) => (
            <div key={i} className="friend-card">
              <div className="friend-avatar">{f.initial}</div>
              <div>
                <div className="friend-name">{f.name}</div>
                <div className="friend-meta">{f.role}</div>
              </div>
              <button className="friend-btn">Following</button>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
