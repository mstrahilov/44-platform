const glassStyles = [
  {
    name: 'Glass Panel',
    className: 'os-glass-panel',
    specs: 'Stable frosted panel · blur 24px · green-gray translucent background · large radius',
    usage: 'Sidebars, inspectors, dashboard panels, library panels, creator tool panels.',
  },
  {
    name: 'Glass Chrome',
    className: 'os-glass-chrome',
    specs: 'Floating pure glass chrome · pill radius · brighter border · stronger saturation',
    usage: 'Top navigation, floating search, compact toolbars, system chrome.',
  },
  {
    name: 'Glass Control',
    className: 'os-glass-control',
    specs: 'Small interactive glass control · soft blur · pill radius · light highlight',
    usage: 'Buttons, icon controls, filter pills, segmented controls, compact actions.',
  },
  {
    name: 'Glass Recessed',
    className: 'os-glass-recessed',
    specs: 'Inset glass well · subtle darkened background · inner shadow',
    usage: 'Search fields, input wells, selected regions, recessed control areas.',
  },
];

export default function FortyOSGlassPage() {
  return (
    <main className="glass-doc">
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

        .glass-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 190, 120, 0.36), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.22), transparent 32%),
            radial-gradient(circle at 50% 88%, rgba(120, 180, 120, 0.22), transparent 42%),
            var(--os-color-app-environment);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .glass-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .glass-header {
          margin-bottom: var(--os-space-9);
        }

        .glass-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .glass-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .glass-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .glass-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .glass-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .glass-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .glass-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 16% 14%, rgba(255,255,255,.42), transparent 24%),
            radial-gradient(circle at 78% 24%, rgba(255,160,110,.28), transparent 28%),
            radial-gradient(circle at 62% 82%, rgba(110,150,255,.2), transparent 34%),
            rgba(255,255,255,.22);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
          min-height: 260px;
          position: relative;
        }

        .glass-sample::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .08;
          background-image:
            linear-gradient(rgba(0,0,0,.32) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,.32) 1px, transparent 1px);
          background-size: 18px 18px;
          pointer-events: none;
        }

        .glass-preview-row {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .glass-preview-panel {
          width: 280px;
          min-height: 168px;
          padding: var(--os-panel-pad);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .glass-preview-chrome {
          width: 360px;
          min-height: 58px;
          padding: 0 var(--os-space-3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--os-space-2);
        }

        .glass-preview-control {
          min-width: 148px;
          min-height: 44px;
          padding: 0 var(--os-space-5);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .glass-preview-recessed {
          width: 320px;
          min-height: 48px;
          padding: 0 var(--os-space-4);
          display: flex;
          align-items: center;
          color: rgba(0,0,0,.48);
        }

        .glass-fake-nav-dot {
  width: 74px;
  height: 34px;
  border-radius: var(--os-radius-pill);
  background:
    linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,255,255,.28));
  border: 1px solid rgba(255,255,255,.52);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.72),
    inset 0 -1px 0 rgba(0,0,0,.08),
    0 6px 18px rgba(0,0,0,.055);
}

        .glass-preview-title {
          color: rgba(255,255,255,.9);
        }

        .glass-preview-copy {
          margin-top: var(--os-space-2);
          color: rgba(255,255,255,.62);
        }

        .glass-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .glass-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .glass-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .glass-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .glass-sample {
            padding: var(--os-space-6);
          }

          .glass-preview-panel,
          .glass-preview-chrome,
          .glass-preview-recessed {
            width: 100%;
          }

          .glass-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="glass-page">
        <header className="glass-header">
          <div className="glass-kicker os-type-eyebrow">44OS Materials</div>

          <h1 className="glass-title os-type-page-title">44OS Glass</h1>

          <p className="glass-description os-type-body">
            Glass is used for interface chrome and stable app surfaces. It should respond
            to the environment behind it, but it should not make content harder to read.
            Panels are stable and frosted. Chrome is lighter and more adaptive. Inputs can
            feel recessed into the material.
          </p>
        </header>

        {glassStyles.map((style) => (
          <section key={style.name} className="glass-style">
            <h2 className="glass-style-name os-type-section-title">{style.name}</h2>

            <div className="glass-sample">
              <div className="glass-preview-row">
                {style.className === 'os-glass-panel' && (
                  <div className={`${style.className} glass-preview-panel`}>
                    <div>
                      <div className="glass-preview-title os-type-card-title">Browse</div>
                      <div className="glass-preview-copy os-type-body-small">
                        Stable frosted panels hold navigation, filters, and inspectors.
                      </div>
                    </div>
                    <div className="glass-preview-copy os-type-meta">PANEL MATERIAL</div>
                  </div>
                )}

                {style.className === 'os-glass-chrome' && (
                  <div className={`${style.className} glass-preview-chrome`}>
                    <div className="glass-fake-nav-dot" />
                    <div className="glass-fake-nav-dot" />
                    <div className="glass-fake-nav-dot" />
                  </div>
                )}

                {style.className === 'os-glass-control' && (
                  <div className={`${style.className} glass-preview-control os-type-button`}>
                    Add to Library
                  </div>
                )}

                {style.className === 'os-glass-recessed' && (
                  <div className={`${style.className} glass-preview-recessed os-type-body-small`}>
                    Search the store
                  </div>
                )}
              </div>
            </div>

            <div className="glass-details">
              <div className="glass-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="glass-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="glass-detail-row os-type-body-small">
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