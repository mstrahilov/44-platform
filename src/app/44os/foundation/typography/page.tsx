const sampleSentence = 'Create, collect, and experience the work.';

const typeStyles = [
  {
    name: 'Display',
    className: 'os-type-display',
    specs: '54px / 0.94 line height · weight 760 · tracking -0.064em',
    usage: 'Hero titles, flagship item pages, album detail heroes, major system moments.',
  },
  {
    name: 'Page Title',
    className: 'os-type-page-title',
    specs: '40px / 1.0 line height · weight 760 · tracking -0.056em',
    usage: 'Main page titles such as Browse, Library, Dashboard, Settings, Creator Studio.',
  },
  {
    name: 'Panel Title',
    className: 'os-type-panel-title',
    specs: '31px / 0.98 line height · weight 760 · tracking -0.052em',
    usage: 'Sidebar titles, inspector headings, focused panel titles, compact page headers.',
  },
  {
    name: 'Section Title',
    className: 'os-type-section-title',
    specs: '22px / 1.12 line height · weight 740 · tracking -0.042em',
    usage: 'Section headers such as Tracks, Components, Downloads, Achievements, Related.',
  },
  {
    name: 'Card Title',
    className: 'os-type-card-title',
    specs: '17px / 1.08 line height · weight 730 · tracking -0.038em',
    usage: 'Product cards, album cards, component cards, achievement cards, download cards.',
  },
  {
    name: 'Sidebar Row',
    className: 'os-type-sidebar-row',
    specs: '16px / 1.2 line height · weight 740 · tracking -0.024em',
    usage: 'Sidebar navigation rows, browse category rows, library category rows.',
  },
  {
    name: 'Body',
    className: 'os-type-body',
    specs: '15px / 1.46 line height · weight 520 · tracking -0.01em',
    usage: 'Descriptions, paragraphs, item body copy, release notes, creator explanations.',
  },
  {
    name: 'Body Small',
    className: 'os-type-body-small',
    specs: '13px / 1.45 line height · weight 520 · tracking -0.006em',
    usage: 'Inspector descriptions, helper text, small panel copy, compact explanations.',
  },
  {
    name: 'Metadata',
    className: 'os-type-meta',
    specs: '12px / 1.35 line height · weight 560 · tracking 0',
    usage: 'Creator names, file metadata, timestamps, secondary labels, compact details.',
  },
  {
    name: 'Button Label',
    className: 'os-type-button',
    specs: '14px / 1.15 line height · weight 800 · tracking -0.012em',
    usage: 'Primary actions, secondary actions, publish buttons, library actions.',
  },
  {
    name: 'Navigation Label',
    className: 'os-type-nav',
    specs: '11px / 1.2 line height · weight 760 · tracking 0.13em',
    usage: 'Top navigation, chrome labels, compact system navigation.',
  },
  {
    name: 'Eyebrow',
    className: 'os-type-eyebrow',
    specs: '11px / 1.2 line height · weight 800 · tracking 0.14em',
    usage: 'Small uppercase labels above titles, sections, panels, and system groups.',
  },
  {
    name: 'Status Pill',
    className: 'os-type-pill',
    specs: '11px / 1.2 line height · weight 760 · tracking 0.06em',
    usage: 'Included, Locked, Owned, Paid, Coming Soon, New, Completed, Downloaded.',
  },
];

export default function FortyOSTypographyPage() {
  return (
    <main className="typography-doc">
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

        .typography-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .typography-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .typography-header {
          margin-bottom: var(--os-space-9);
        }

        .typography-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .typography-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .typography-description {
          margin: var(--os-space-4) 0 0;
          max-width: 720px;
          color: var(--os-color-ink-secondary);
        }

        .typography-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .typography-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .typography-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .typography-sample {
          border-radius: var(--os-radius-3, 14px);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-7) var(--os-space-7);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .typography-sample-text {
          color: var(--os-color-ink);
        }

        .typography-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .typography-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .typography-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .typography-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .typography-sample {
            padding: var(--os-space-6);
          }

          .typography-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="typography-page">
        <header className="typography-header">
          <div className="typography-kicker os-type-eyebrow">44OS Foundation</div>

          <h1 className="typography-title os-type-page-title">44OS Typography</h1>

          <p className="typography-description os-type-body">
            These are the reusable text styles for the 44OS application interface.
            Every page, card, panel, button, navigation item, metadata row, and album
            component should pull from these roles instead of defining one-off typography.
          </p>
        </header>

        {typeStyles.map((style) => (
          <section key={style.name} className="typography-style">
            <h2 className="typography-style-name os-type-section-title">{style.name}</h2>

            <div className="typography-sample">
              <div className={`${style.className} typography-sample-text`}>
                {sampleSentence}
              </div>
            </div>

            <div className="typography-details">
              <div className="typography-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="typography-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="typography-detail-row os-type-body-small">
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