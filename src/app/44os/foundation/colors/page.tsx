const colorStyles = [
  {
    name: 'Canvas',
    token: '--os-color-canvas',
    value: '#f7f7f4',
    specs: 'Light foundation background · warm off-white · used behind documentation pages',
    usage: 'Design docs, light system pages, low-distraction background areas.',
  },
  {
    name: 'Ink',
    token: '--os-color-ink',
    value: '#151515',
    specs: 'Primary text color · near-black · high contrast on light surfaces',
    usage: 'Primary page titles, body text, important labels, readable foreground content.',
  },
  {
    name: 'Ink Secondary',
    token: '--os-color-ink-secondary',
    value: 'rgba(0, 0, 0, 0.58)',
    specs: 'Secondary text · 58% black · softer supporting copy',
    usage: 'Descriptions, specs, usage text, metadata, helper copy.',
  },
  {
    name: 'Ink Muted',
    token: '--os-color-ink-muted',
    value: 'rgba(0, 0, 0, 0.42)',
    specs: 'Muted text · 42% black · low-emphasis labels',
    usage: 'Kickers, quiet labels, inactive text, low-priority interface details.',
  },
  {
    name: 'Sample Surface',
    token: '--os-color-sample-surface',
    value: 'rgba(0, 0, 0, 0.045)',
    specs: 'Light gray sample surface · subtle contrast against canvas',
    usage: 'Design-doc preview boxes, neutral examples, typography and spacing samples.',
  },
  {
    name: 'Hairline',
    token: '--os-color-hairline',
    value: 'rgba(0, 0, 0, 0.10)',
    specs: 'Subtle divider · 10% black · quiet structural separation',
    usage: 'Section borders, list dividers, documentation separators, light panel outlines.',
  },
  {
    name: 'App Environment',
    token: '--os-color-app-environment',
    value: '#eef0ea',
    specs: 'Light 44OS environment base · soft green-gray foundation',
    usage: 'Main app background when the interface is in light environmental mode.',
  },
  {
    name: 'Frosted Panel',
    token: '--os-color-frosted-panel',
    value: 'rgba(82, 92, 78, 0.42)',
    specs: 'Green-gray frosted material · translucent stable panel surface',
    usage: 'Sidebars, inspectors, dashboard panels, persistent navigation surfaces.',
  },
  {
    name: 'Frosted Border',
    token: '--os-color-frosted-border',
    value: 'rgba(255, 255, 255, 0.28)',
    specs: 'Soft white glass border · separates frosted surfaces from the environment',
    usage: 'Panel borders, glass controls, chrome edges, selected material outlines.',
  },
  {
    name: 'Paper',
    token: '--os-color-paper',
    value: '#fbfaf6',
    specs: 'Warm paper surface · opaque object/card color',
    usage: 'Product cards, resource cards, content objects, readable card bodies.',
  },
  {
    name: 'Paper Border',
    token: '--os-color-paper-border',
    value: 'rgba(0, 0, 0, 0.08)',
    specs: 'Subtle object border · 8% black · card edge definition',
    usage: 'Paper cards, object cards, quiet containers, readable card boundaries.',
  },
  {
    name: 'Accent',
    token: '--os-color-accent',
    value: '#7cff4f',
    specs: '44OS accent green · bright signal color · used sparingly',
    usage: 'Positive state, progress, unlocks, active moments, achievement highlights.',
  },
  {
    name: 'Owned',
    token: '--os-color-owned',
    value: '#7cff4f',
    specs: 'Owned state · green · confirms access or ownership',
    usage: 'Owned products, added-to-library state, completed ownership actions.',
  },
  {
    name: 'Locked',
    token: '--os-color-locked',
    value: '#8e8e93',
    specs: 'Locked state · neutral gray · unavailable but visible',
    usage: 'Locked components, hidden extras, inactive unlock states.',
  },
  {
    name: 'Paid',
    token: '--os-color-paid',
    value: '#ffd166',
    specs: 'Paid state · warm yellow · premium or purchase-required content',
    usage: 'Paid add-ons, premium modules, purchase-required unlocks.',
  },
  {
    name: 'Coming Soon',
    token: '--os-color-coming-soon',
    value: '#7ea7ff',
    specs: 'Upcoming state · soft blue · future content signal',
    usage: 'Coming soon modules, unreleased updates, scheduled drops.',
  },
  {
    name: 'Danger',
    token: '--os-color-danger',
    value: '#ff5a5f',
    specs: 'Destructive state · red · rare high-attention warning',
    usage: 'Delete actions, errors, failed states, destructive confirmations.',
  },
];

export default function FortyOSColorsPage() {
  return (
    <main className="colors-doc">
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

        .colors-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .colors-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .colors-header {
          margin-bottom: var(--os-space-9);
        }

        .colors-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .colors-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .colors-description {
          margin: var(--os-space-4) 0 0;
          max-width: 720px;
          color: var(--os-color-ink-secondary);
        }

        .colors-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .colors-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .colors-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .colors-sample {
          border-radius: var(--os-radius-3, 14px);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-7);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .colors-swatch {
          width: 100%;
          min-height: 148px;
          border-radius: var(--os-radius-2, 10px);
          border: 1px solid var(--os-color-paper-border);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.38),
            0 14px 34px rgba(0,0,0,.045);
        }

        .colors-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .colors-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .colors-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .colors-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .colors-sample {
            padding: var(--os-space-6);
          }

          .colors-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="colors-page">
        <header className="colors-header">
          <div className="colors-kicker os-type-eyebrow">44OS Foundation</div>

          <h1 className="colors-title os-type-page-title">44OS Colors</h1>

          <p className="colors-description os-type-body">
            These are the reusable color roles for the 44OS interface. The system should
            reference color by purpose instead of using one-off values. Cards, panels,
            status states, typography, materials, and app pages should pull from these
            tokens.
          </p>
        </header>

        {colorStyles.map((style) => (
          <section key={style.name} className="colors-style">
            <h2 className="colors-style-name os-type-section-title">{style.name}</h2>

            <div className="colors-sample">
              <div
                className="colors-swatch"
                style={{
                  background: `var(${style.token})`,
                }}
              />
            </div>

            <div className="colors-details">
              <div className="colors-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>
                  {style.value} · {style.specs}
                </span>
              </div>

              <div className="colors-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="colors-detail-row os-type-body-small">
                <strong>Token</strong>
                <span>{style.token}</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}