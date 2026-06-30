import { PageShell } from '@/components/Ui';

export default function AchievementsPage() {
  return (
    <PageShell>
      <style>{`
        .placeholder-page { display: flex; flex-direction: column; gap: 24px; }
        .placeholder-header { display: flex; flex-direction: column; gap: 8px; }
        .ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .ach-card {
          padding: 20px;
          border-radius: 14px;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          display: flex; gap: 14px; align-items: flex-start;
        }
        .ach-card.locked { opacity: 0.45; }
        .ach-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center; font-size: 22px;
        }
        .ach-body { flex: 1; }
        .ach-name { font-size: 14px; font-weight: 600; color: var(--os-color-ink); margin-bottom: 3px; }
        .ach-desc { font-size: 12px; color: var(--os-color-ink-secondary); line-height: 1.4; }
        .ach-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; color: var(--os-color-ink-muted); margin-top: 6px; text-transform: uppercase; }
      `}</style>
      <div className="placeholder-page">
        <div className="placeholder-header">
          <h1 className="os-type-display">Achievements</h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Milestones and collectibles earned across 44.</p>
        </div>
        <div className="ach-grid">
          {[
            { icon: '🎉', name: 'First Sale', desc: 'Made your first sale on the platform.', earned: true, date: 'Jun 12' },
            { icon: '🎵', name: 'Sound Pioneer', desc: 'Published 5 music tracks to the Store.', earned: true, date: 'Jun 18' },
            { icon: '⭐', name: 'Top Rated', desc: 'Received a 5-star rating on a service.', earned: true, date: 'Jun 22' },
            { icon: '🤝', name: 'Collaborator', desc: 'Completed a collaboration project.', earned: false, date: null },
            { icon: '📚', name: 'Knowledge Share', desc: 'Published a resource guide.', earned: false, date: null },
            { icon: '🔥', name: '100 Sales', desc: 'Reached 100 total sales on 44.', earned: false, date: null },
          ].map((a, i) => (
            <div key={i} className={`ach-card${a.earned ? '' : ' locked'}`}>
              <div className="ach-icon">{a.icon}</div>
              <div className="ach-body">
                <div className="ach-name">{a.name}</div>
                <div className="ach-desc">{a.desc}</div>
                <div className="ach-badge">{a.earned ? `Earned ${a.date}` : 'Locked'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
