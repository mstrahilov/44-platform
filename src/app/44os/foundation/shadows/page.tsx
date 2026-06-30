const shadowStyles = [
  {
    name: 'Shadow 1',
    token: '--os-shadow-1',
    value: '0 4px 12px rgba(0, 0, 0, 0.04)',
    specs: 'Smallest elevation · almost flat · quiet separation',
    usage: 'Tiny cards, small buttons, low-emphasis objects, subtle hover states.',
  },
  {
    name: 'Shadow 2',
    token: '--os-shadow-2',
    value: '0 8px 22px rgba(0, 0, 0, 0.06)',
    specs: 'Soft object elevation · light lift from the surface',
    usage: 'Compact cards, paper objects, small previews, contained UI elements.',
  },
  {
    name: 'Shadow 3',
    token: '--os-shadow-3',
    value: '0 14px 34px rgba(0, 0, 0, 0.08)',
    specs: 'Default card elevation · readable object separation',
    usage: 'Product cards, resource cards, component cards, artwork containers.',
  },
  {
    name: 'Shadow 4',
    token: '--os-shadow-4',
    value: '0 22px 54px rgba(0, 0, 0, 0.10)',
    specs: 'Large card elevation · stronger depth without becoming heavy',
    usage: 'Featured cards, selected cards, hover lift, larger content objects.',
  },
  {
    name: 'Shadow 5',
    token: '--os-shadow-5',
    value: '0 34px 84px rgba(0, 0, 0, 0.14)',
    specs: 'Highest regular elevation · strong foreground object',
    usage: 'Large feature cards, elevated previews, important floating surfaces.',
  },
  {
    name: 'Paper Shadow',
    token: '--os-shadow-paper',
    value: '0 14px 34px rgba(0, 0, 0, 0.06)',
    specs: 'Paper object shadow · soft and physical',
    usage: 'Paper cards, store objects, album cards, resource objects.',
  },
  {
    name: 'Card Shadow',
    token: '--os-shadow-card',
    value: '0 18px 44px rgba(0, 0, 0, 0.08)',
    specs: 'Default card shadow · object-like interface depth',
    usage: 'Product cards, service cards, library cards, achievement cards.',
  },
  {
    name: 'Panel Shadow',
    token: '--os-shadow-panel',
    value: '0 28px 76px rgba(0, 0, 0, 0.16)',
    specs: 'Stable panel shadow · anchors larger frosted surfaces',
    usage: 'Sidebars, inspectors, dashboard panels, creator builder panels.',
  },
  {
    name: 'Chrome Shadow',
    token: '--os-shadow-chrome',
    value: '0 18px 46px rgba(0, 0, 0, 0.18)',
    specs: 'Floating chrome shadow · compact but noticeable elevation',
    usage: 'Top navigation, floating search, glass buttons, toolbars, menus.',
  },
  {
    name: 'Modal Shadow',
    token: '--os-shadow-modal',
    value: '0 44px 120px rgba(0, 0, 0, 0.24)',
    specs: 'Highest interface elevation · separates modal layers from the app',
    usage: 'Modals, popovers, confirmation dialogs, focused overlay panels.',
  },
  {
    name: 'Inset Highlight',
    token: '--os-shadow-inset-highlight',
    value: 'inset 0 1px 0 rgba(255, 255, 255, 0.58)',
    specs: 'Internal top highlight · gives surfaces a light edge',
    usage: 'Glass panels, paper cards, buttons, controls, elevated surfaces.',
  },
  {
    name: 'Inset Border',
    token: '--os-shadow-inset-border',
    value: 'inset 0 0 0 1px rgba(255, 255, 255, 0.20)',
    specs: 'Internal edge definition · subtle material boundary',
    usage: 'Glass chrome, frosted panels, selected objects, translucent controls.',
  },
  {
    name: 'Inset Recessed',
    token: '--os-shadow-inset-recessed',
    value: 'inset 0 1px 2px rgba(0, 0, 0, 0.10)',
    specs: 'Recessed inner shadow · makes controls feel carved inward',
    usage: 'Search fields, inputs, recessed wells, selected filter areas.',
  },
];

export default function FortyOSShadowsPage() {
  return (
    <main className="shadows-doc">
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

        .shadows-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .shadows-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .shadows-header {
          margin-bottom: var(--os-space-9);
        }

        .shadows-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .shadows-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .shadows-description {
          margin: var(--os-space-4) 0 0;
          max-width: 720px;
          color: var(--os-color-ink-secondary);
        }

        .shadows-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .shadows-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .shadows-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .shadows-sample {
          border-radius: var(--os-radius-3, 14px);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .shadows-preview-row {
          display: flex;
          align-items: center;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .shadows-preview {
          width: 190px;
          height: 126px;
          border-radius: var(--os-radius-5, 22px);
          background: var(--os-color-paper);
          border: 1px solid var(--os-color-paper-border);
        }

        .shadows-preview-panel {
          width: 250px;
          height: 126px;
          border-radius: var(--os-radius-6, 26px);
          background: var(--os-color-frosted-panel);
          border: 1px solid var(--os-color-frosted-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .shadows-preview-recessed {
          width: 190px;
          height: 54px;
          border-radius: var(--os-radius-pill, 999px);
          background: rgba(255,255,255,.5);
          border: 1px solid var(--os-color-paper-border);
        }

        .shadows-value {
          color: var(--os-color-ink-secondary);
          font-weight: 700;
          max-width: 360px;
        }

        .shadows-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .shadows-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .shadows-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .shadows-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .shadows-sample {
            padding: var(--os-space-6);
          }

          .shadows-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="shadows-page">
        <header className="shadows-header">
          <div className="shadows-kicker os-type-eyebrow">44OS Foundation</div>

          <h1 className="shadows-title os-type-page-title">44OS Shadows</h1>

          <p className="shadows-description os-type-body">
            These are the reusable shadow roles for the 44OS interface. Shadows define
            how objects sit above the environment: paper cards should feel physical,
            panels should feel stable, chrome should float, and modals should clearly
            rise above everything else.
          </p>
        </header>

        {shadowStyles.map((style) => {
          const isInset = style.token.includes('inset');

          return (
            <section key={style.name} className="shadows-style">
              <h2 className="shadows-style-name os-type-section-title">{style.name}</h2>

              <div className="shadows-sample">
                <div className="shadows-preview-row">
                  {isInset ? (
                    <div
                      className="shadows-preview-recessed"
                      style={{
                        boxShadow: `var(${style.token})`,
                      }}
                    />
                  ) : (
                    <>
                      <div
                        className="shadows-preview"
                        style={{
                          boxShadow: `var(${style.token})`,
                        }}
                      />

                      <div
                        className="shadows-preview-panel"
                        style={{
                          boxShadow: `var(${style.token})`,
                        }}
                      />
                    </>
                  )}

                  <div className="shadows-value os-type-body-small">
                    var({style.token}) · {style.value}
                  </div>
                </div>
              </div>

              <div className="shadows-details">
                <div className="shadows-detail-row os-type-body-small">
                  <strong>Specs</strong>
                  <span>
                    {style.value} · {style.specs}
                  </span>
                </div>

                <div className="shadows-detail-row os-type-body-small">
                  <strong>Usage</strong>
                  <span>{style.usage}</span>
                </div>

                <div className="shadows-detail-row os-type-body-small">
                  <strong>Token</strong>
                  <span>{style.token}</span>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}