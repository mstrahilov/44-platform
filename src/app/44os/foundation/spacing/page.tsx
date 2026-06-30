const spacingStyles = [
  {
    name: 'Space 1',
    token: '--os-space-1',
    value: '4px',
    specs: 'Smallest spacing unit · used for tiny internal separation',
    usage: 'Icon/text gaps, small stacked labels, compact metadata spacing.',
  },
  {
    name: 'Space 2',
    token: '--os-space-2',
    value: '8px',
    specs: 'Base compact spacing · used inside dense interface elements',
    usage: 'Small button gaps, row spacing, compact controls, chips, pills.',
  },
  {
    name: 'Space 3',
    token: '--os-space-3',
    value: '12px',
    specs: 'Small interface spacing · common internal component rhythm',
    usage: 'List rows, card metadata gaps, compact panel groups.',
  },
  {
    name: 'Space 4',
    token: '--os-space-4',
    value: '16px',
    specs: 'Default component spacing · primary internal gap',
    usage: 'Card padding, grid gaps, section row spacing, form fields.',
  },
  {
    name: 'Space 5',
    token: '--os-space-5',
    value: '20px',
    specs: 'Medium component spacing · slightly more open than default',
    usage: 'Panel padding, card groups, sidebar groups, inspector sections.',
  },
  {
    name: 'Space 6',
    token: '--os-space-6',
    value: '24px',
    specs: 'Section spacing · creates clear grouping without feeling large',
    usage: 'Section header to content, major card groups, panel sections.',
  },
  {
    name: 'Space 7',
    token: '--os-space-7',
    value: '32px',
    specs: 'Large internal spacing · used for calm readable areas',
    usage: 'Hero spacing, large panels, detail page content spacing.',
  },
  {
    name: 'Space 8',
    token: '--os-space-8',
    value: '40px',
    specs: 'Large section spacing · separates major page areas',
    usage: 'Between major blocks, page headers, feature content groups.',
  },
  {
    name: 'Space 9',
    token: '--os-space-9',
    value: '48px',
    specs: 'Extra-large page spacing · creates editorial breathing room',
    usage: 'Large page sections, documentation pages, hero-to-content spacing.',
  },
  {
    name: 'Space 10',
    token: '--os-space-10',
    value: '64px',
    specs: 'Maximum regular spacing · reserved for major vertical breaks',
    usage: 'Top-level page rhythm, large docs, big transitions between systems.',
  },
  {
    name: 'Page Padding',
    token: '--os-page-pad',
    value: '24px',
    specs: 'Default page edge padding · keeps app content away from viewport edges',
    usage: '44OS app pages, browse pages, dashboard pages, library pages.',
  },
  {
    name: 'Shell Gap',
    token: '--os-shell-gap',
    value: '18px',
    specs: 'Default spacing between major shell regions',
    usage: 'Sidebar to content, content to inspector, panel-to-panel gaps.',
  },
  {
    name: 'Panel Padding',
    token: '--os-panel-pad',
    value: '22px',
    specs: 'Default padding inside stable panels',
    usage: 'Sidebars, inspectors, dashboard panels, library panels.',
  },
  {
    name: 'Card Padding',
    token: '--os-card-pad',
    value: '16px',
    specs: 'Default padding inside object cards',
    usage: 'Product cards, component cards, resource cards, achievement cards.',
  },
  {
    name: 'Card Gap',
    token: '--os-card-gap',
    value: '16px',
    specs: 'Default gap between cards in a grid',
    usage: 'Product grids, resource grids, component grids, dashboard cards.',
  },
  {
    name: 'Section Gap',
    token: '--os-section-gap',
    value: '24px',
    specs: 'Default gap between a section title and its content',
    usage: 'Tracks, included components, related items, downloads, achievements.',
  },
  {
    name: 'Sidebar Width',
    token: '--os-sidebar-width',
    value: '300px',
    specs: 'Default left sidebar width for application pages',
    usage: 'Browse sidebar, library sidebar, dashboard navigation, creator builder sidebar.',
  },
  {
    name: 'Inspector Width',
    token: '--os-inspector-width',
    value: '330px',
    specs: 'Default right inspector width for detail pages',
    usage: 'Product detail inspector, album detail inspector, creator preview inspector.',
  },
  {
    name: 'Topbar Height',
    token: '--os-topbar-height',
    value: '56px',
    specs: 'Compact chrome height for top app controls',
    usage: '44OS top navigation, floating search chrome, page toolbars.',
  },
];

export default function FortyOSSpacingPage() {
  return (
    <main className="spacing-doc">
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

        .spacing-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .spacing-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .spacing-header {
          margin-bottom: var(--os-space-9);
        }

        .spacing-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .spacing-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .spacing-description {
          margin: var(--os-space-4) 0 0;
          max-width: 720px;
          color: var(--os-color-ink-secondary);
        }

        .spacing-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .spacing-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .spacing-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .spacing-sample {
          border-radius: var(--os-radius-3, 14px);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-7);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .spacing-measure {
          display: flex;
          align-items: center;
          gap: var(--os-space-4);
        }

        .spacing-bar {
          height: 28px;
          border-radius: var(--os-radius-pill, 999px);
          background: var(--os-color-ink);
          min-width: 1px;
        }

        .spacing-value {
          color: var(--os-color-ink-secondary);
          font-weight: 700;
        }

        .spacing-layout-preview {
          display: grid;
          gap: var(--os-shell-gap);
        }

        .spacing-shell-preview {
          display: grid;
          grid-template-columns: var(--os-sidebar-width) minmax(0, 1fr) var(--os-inspector-width);
          gap: var(--os-shell-gap);
          min-height: 220px;
        }

        .spacing-preview-sidebar,
        .spacing-preview-content,
        .spacing-preview-inspector {
          border-radius: var(--os-radius-3, 14px);
          border: 1px solid var(--os-color-paper-border);
          background: rgba(255,255,255,.5);
          padding: var(--os-card-pad);
          color: var(--os-color-ink-secondary);
          font-weight: 720;
        }

        .spacing-preview-content {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--os-card-gap);
        }

        .spacing-preview-card {
          border-radius: var(--os-radius-2, 10px);
          background: var(--os-color-paper);
          border: 1px solid var(--os-color-paper-border);
          min-height: 76px;
        }

        .spacing-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .spacing-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .spacing-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 900px) {
          .spacing-shell-preview {
            grid-template-columns: 1fr;
          }

          .spacing-preview-content {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .spacing-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .spacing-sample {
            padding: var(--os-space-6);
          }

          .spacing-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="spacing-page">
        <header className="spacing-header">
          <div className="spacing-kicker os-type-eyebrow">44OS Foundation</div>

          <h1 className="spacing-title os-type-page-title">44OS Spacing</h1>

          <p className="spacing-description os-type-body">
            These are the reusable spacing roles for the 44OS interface. Spacing should
            be defined once and reused across pages, panels, cards, grids, sidebars, and
            inspectors so the product feels consistent instead of manually adjusted page
            by page.
          </p>
        </header>

        <section className="spacing-style">
          <h2 className="spacing-style-name os-type-section-title">Application Shell</h2>

          <div className="spacing-sample">
            <div className="spacing-layout-preview">
              <div className="spacing-shell-preview">
                <div className="spacing-preview-sidebar os-type-meta">Sidebar · var(--os-sidebar-width)</div>

                <div className="spacing-preview-content">
                  <div className="spacing-preview-card" />
                  <div className="spacing-preview-card" />
                  <div className="spacing-preview-card" />
                  <div className="spacing-preview-card" />
                  <div className="spacing-preview-card" />
                  <div className="spacing-preview-card" />
                </div>

                <div className="spacing-preview-inspector os-type-meta">
                  Inspector · var(--os-inspector-width)
                </div>
              </div>
            </div>
          </div>

          <div className="spacing-details">
            <div className="spacing-detail-row os-type-body-small">
              <strong>Specs</strong>
              <span>
                var(--os-sidebar-width) sidebar · var(--os-shell-gap) shell gap · flexible content · var(--os-inspector-width) inspector
              </span>
            </div>

            <div className="spacing-detail-row os-type-body-small">
              <strong>Usage</strong>
              <span>
                Browse pages, product detail pages, album pages, library detail pages,
                dashboard layouts, creator tools.
              </span>
            </div>

            <div className="spacing-detail-row os-type-body-small">
              <strong>Tokens</strong>
              <span>--os-sidebar-width · --os-shell-gap · --os-inspector-width</span>
            </div>
          </div>
        </section>

        {spacingStyles.map((style) => (
          <section key={style.name} className="spacing-style">
            <h2 className="spacing-style-name os-type-section-title">{style.name}</h2>

            <div className="spacing-sample">
              <div className="spacing-measure">
                <div
                  className="spacing-bar"
                  style={{
                    width: `var(${style.token})`,
                  }}
                />
                <div className="spacing-value os-type-body-small">
                  var({style.token}) · {style.value}
                </div>
              </div>
            </div>

            <div className="spacing-details">
              <div className="spacing-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>
                  {style.value} · {style.specs}
                </span>
              </div>

              <div className="spacing-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="spacing-detail-row os-type-body-small">
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