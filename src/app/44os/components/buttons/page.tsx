const buttonStyles = [
  {
    name: 'Primary Button',
    className: 'os-button os-button-primary',
    specs: 'Primary action · dark ink background · pill radius · 44px height',
    usage: 'Main actions such as Add to Library, Publish, Checkout, Continue, Save.',
    sample: 'Add to Library',
  },
  {
    name: 'Secondary Button',
    className: 'os-button os-button-secondary',
    specs: 'Secondary action · paper material · soft border · physical shadow',
    usage: 'Secondary choices, preview actions, alternate actions, safe supporting actions.',
    sample: 'Preview',
  },
  {
    name: 'Ghost Button',
    className: 'os-button os-button-ghost',
    specs: 'Low-emphasis action · translucent surface · quiet border',
    usage: 'Cancel, learn more, optional actions, low-priority interface controls.',
    sample: 'Learn More',
  },
  {
    name: 'Glass Button',
    className: 'os-button os-button-glass',
    specs: 'Glass control button · translucent material · blur and highlight',
    usage: 'Floating actions, chrome-adjacent controls, panel actions, filter controls.',
    sample: 'Open',
  },
  {
    name: 'Danger Button',
    className: 'os-button os-button-danger',
    specs: 'Destructive action · danger color · reserved for rare high-risk actions',
    usage: 'Delete, remove, discard, destructive confirmations.',
    sample: 'Delete',
  },
  {
    name: 'Disabled Button',
    className: 'os-button os-button-disabled',
    specs: 'Unavailable action · muted text · no elevation · non-interactive',
    usage: 'Unavailable states, locked actions, incomplete form steps, disabled controls.',
    sample: 'Unavailable',
  },
  {
    name: 'Compact Button',
    className: 'os-button os-button-secondary os-button-compact',
    specs: 'Compact action · 36px height · tighter horizontal padding',
    usage: 'Toolbars, card actions, small panels, dense interfaces.',
    sample: 'Edit',
  },
  {
    name: 'Large Button',
    className: 'os-button os-button-primary os-button-large',
    specs: 'Large action · 52px height · stronger touch target',
    usage: 'Checkout, onboarding, creator setup, important form actions.',
    sample: 'Continue',
  },
  {
    name: 'Icon Button',
    className: 'os-button os-button-glass os-icon-button',
    specs: 'Circular icon action · 44px square · pill radius',
    usage: 'Search, user menu, close, add, favorite, compact floating controls.',
    sample: '+',
  },
];

export default function FortyOSButtonsPage() {
  return (
    <main className="buttons-doc">
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

        .buttons-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .buttons-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .buttons-header {
          margin-bottom: var(--os-space-9);
        }

        .buttons-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .buttons-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .buttons-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .buttons-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .buttons-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .buttons-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .buttons-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 190, 120, 0.18), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.12), transparent 32%),
            var(--os-color-sample-surface);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .buttons-preview-row {
          display: flex;
          align-items: center;
          gap: var(--os-space-5);
          flex-wrap: wrap;
        }

        .buttons-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .buttons-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .buttons-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .buttons-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .buttons-sample {
            padding: var(--os-space-6);
          }

          .buttons-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="buttons-page">
        <header className="buttons-header">
          <div className="buttons-kicker os-type-eyebrow">44OS Components</div>

          <h1 className="buttons-title os-type-page-title">44OS Buttons</h1>

          <p className="buttons-description os-type-body">
            Buttons are reusable action components. They should use the same type,
            spacing, radius, shadow, color, glass, and paper systems as the rest of 44OS.
            Primary actions should be obvious, secondary actions should feel supportive,
            and destructive actions should be rare.
          </p>
        </header>

        {buttonStyles.map((style) => (
          <section key={style.name} className="buttons-style">
            <h2 className="buttons-style-name os-type-section-title">{style.name}</h2>

            <div className="buttons-sample">
              <div className="buttons-preview-row">
                <button className={style.className} type="button">
                  {style.sample}
                </button>
              </div>
            </div>

            <div className="buttons-details">
              <div className="buttons-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="buttons-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="buttons-detail-row os-type-body-small">
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