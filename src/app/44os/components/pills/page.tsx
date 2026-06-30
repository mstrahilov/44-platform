const pillStyles = [
  {
    name: 'Pill',
    className: 'os-pill',
    specs: 'Default pill · 28px height · uppercase status label · soft translucent surface',
    usage: 'Categories, filters, small status labels, compact system tags.',
    sample: 'Music',
  },
  {
    name: 'Compact Pill',
    className: 'os-pill os-pill-compact',
    specs: 'Compact pill · 24px height · tighter spacing',
    usage: 'Dense cards, metadata rows, compact sidebars, small inspector labels.',
    sample: 'New',
  },
  {
    name: 'Badge',
    className: 'os-badge',
    specs: 'Badge object · paper surface · slight shadow · squircle radius',
    usage: 'Achievement badges, file badges, module labels, stronger metadata labels.',
    sample: 'Featured',
  },
  {
    name: 'Owned Status',
    className: 'os-pill os-status-owned',
    specs: 'Owned state · green status · confirms access or ownership',
    usage: 'Owned products, library items, completed components, unlocked access.',
    sample: 'Owned',
  },
  {
    name: 'Locked Status',
    className: 'os-pill os-status-locked',
    specs: 'Locked state · neutral gray · visible but unavailable',
    usage: 'Locked bonus content, hidden modules, unavailable actions, gated components.',
    sample: 'Locked',
  },
  {
    name: 'Paid Status',
    className: 'os-pill os-status-paid',
    specs: 'Paid state · warm yellow · purchase-required content',
    usage: 'Paid add-ons, premium modules, paid upgrades, purchasable extras.',
    sample: 'Paid',
  },
  {
    name: 'Coming Soon Status',
    className: 'os-pill os-status-coming-soon',
    specs: 'Upcoming state · soft blue · future content marker',
    usage: 'Coming soon modules, scheduled drops, unreleased components, planned updates.',
    sample: 'Coming Soon',
  },
  {
    name: 'Danger Status',
    className: 'os-pill os-status-danger',
    specs: 'Warning/destructive state · red · rare high-attention label',
    usage: 'Errors, failed uploads, destructive states, rejected or removed content.',
    sample: 'Error',
  },
  {
    name: 'Meta Pill',
    className: 'os-meta-pill',
    specs: 'Metadata pill · compact · title-case friendly · non-uppercase',
    usage: 'Track counts, file types, durations, creator stats, small object metadata.',
    sample: '12 tracks',
  },
];

export default function FortyOSPillsPage() {
  return (
    <main className="pills-doc">
      <style>{`
        .nav-shell {
          display: none !important;
        }

        .app-main {
          height: 100vh !important;
          min-height: 100vh !important;
          overflow: hidden !important;
          display: block !important;
        }

        .pills-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .pills-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .pills-header {
          margin-bottom: var(--os-space-9);
        }

        .pills-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .pills-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .pills-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .pills-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .pills-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .pills-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .pills-sample {
          border-radius: var(--os-radius-3);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .pills-preview-row {
          display: flex;
          align-items: center;
          gap: var(--os-space-4);
          flex-wrap: wrap;
        }

        .pills-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .pills-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .pills-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .pills-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .pills-sample {
            padding: var(--os-space-6);
          }

          .pills-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="pills-page">
        <header className="pills-header">
          <div className="pills-kicker os-type-eyebrow">44OS Components</div>

          <h1 className="pills-title os-type-page-title">44OS Pills + Badges</h1>

          <p className="pills-description os-type-body">
            Pills and badges are compact information components. They identify categories,
            metadata, ownership, locked states, paid states, coming soon content, errors,
            and small system labels. They should support clarity without competing with
            primary actions.
          </p>
        </header>

        {pillStyles.map((style) => (
          <section key={style.name} className="pills-style">
            <h2 className="pills-style-name os-type-section-title">{style.name}</h2>

            <div className="pills-sample">
              <div className="pills-preview-row">
                <span className={style.className}>{style.sample}</span>
              </div>
            </div>

            <div className="pills-details">
              <div className="pills-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="pills-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="pills-detail-row os-type-body-small">
                <strong>Class</strong>
                <span>{style.className}</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}