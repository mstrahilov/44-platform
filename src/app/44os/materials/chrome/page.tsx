const chromeStyles = [
  {
    name: 'Chrome Bar',
    className: 'os-chrome-bar',
    specs: 'Primary floating app chrome · 56px height · pill radius · glass blur · strong highlight',
    usage: 'Top navigation, primary app nav, major floating system controls.',
  },
  {
    name: 'Chrome Toolbar',
    className: 'os-chrome-toolbar',
    specs: 'Compact floating toolbar · 44px height · softer background · lower elevation',
    usage: 'Section toolbars, filter bars, view switchers, compact page controls.',
  },
  {
    name: 'Chrome Item',
    className: 'os-chrome-item',
    specs: 'Default inactive chrome item · text-only · no independent border',
    usage: 'Navigation links, segmented items, toolbar actions, inactive tabs.',
  },
  {
    name: 'Chrome Item Active',
    className: 'os-chrome-item-active',
    specs: 'Selected chrome item · stronger background · visible border · inset highlight',
    usage: 'Active nav item, selected tab, active filter, current view state.',
  },
  {
    name: 'Chrome Icon',
    className: 'os-chrome-icon',
    specs: 'Circular chrome icon control · 38px · soft glass surface',
    usage: 'User button, search button, close button, compact action buttons.',
  },
  {
    name: 'Chrome Search',
    className: 'os-chrome-search',
    specs: 'Recessed chrome search field · pill radius · subtle inner shadow',
    usage: 'Search fields, command bars, compact filtering inputs.',
  },
];

export default function FortyOSChromePage() {
  return (
    <main className="chrome-doc">
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

        .chrome-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 190, 120, 0.22), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.16), transparent 32%),
            radial-gradient(circle at 50% 88%, rgba(120, 180, 120, 0.16), transparent 42%),
            var(--os-color-app-environment);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .chrome-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .chrome-header {
          margin-bottom: var(--os-space-9);
        }

        .chrome-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .chrome-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .chrome-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .chrome-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .chrome-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .chrome-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .chrome-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 16% 14%, rgba(255,255,255,.42), transparent 24%),
            radial-gradient(circle at 78% 24%, rgba(255,160,110,.24), transparent 28%),
            radial-gradient(circle at 62% 82%, rgba(110,150,255,.2), transparent 34%),
            rgba(255,255,255,.2);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
          min-height: 220px;
          position: relative;
        }

        .chrome-sample::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .07;
          background-image:
            linear-gradient(rgba(0,0,0,.32) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,.32) 1px, transparent 1px);
          background-size: 18px 18px;
          pointer-events: none;
        }

        .chrome-preview-row {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: var(--os-space-5);
          flex-wrap: wrap;
        }

        .chrome-preview-bar {
          width: min(560px, 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--os-space-1);
        }

        .chrome-preview-toolbar {
          display: inline-flex;
          align-items: center;
          gap: var(--os-space-1);
        }

        .chrome-preview-search {
          width: 280px;
          display: flex;
          align-items: center;
        }

        .chrome-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .chrome-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .chrome-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .chrome-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .chrome-sample {
            padding: var(--os-space-6);
          }

          .chrome-preview-bar,
          .chrome-preview-search {
            width: 100%;
          }

          .chrome-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="chrome-page">
        <header className="chrome-header">
          <div className="chrome-kicker os-type-eyebrow">44OS Materials</div>

          <h1 className="chrome-title os-type-page-title">44OS Chrome</h1>

          <p className="chrome-description os-type-body">
            Chrome is the system-level interface layer: navigation, search, toolbars,
            segmented controls, and compact app actions. It should feel lighter than
            panels, more interactive than paper, and more structured than generic glass.
          </p>
        </header>

        {chromeStyles.map((style) => (
          <section key={style.name} className="chrome-style">
            <h2 className="chrome-style-name os-type-section-title">{style.name}</h2>

            <div className="chrome-sample">
              <div className="chrome-preview-row">
                {style.className === 'os-chrome-bar' && (
                  <div className={`${style.className} chrome-preview-bar`}>
                    <div className="os-chrome-item os-type-nav">Store</div>
                    <div className="os-chrome-item os-chrome-item-active os-type-nav">Browse</div>
                    <div className="os-chrome-item os-type-nav">Library</div>
                  </div>
                )}

                {style.className === 'os-chrome-toolbar' && (
                  <div className={`${style.className} chrome-preview-toolbar`}>
                    <div className="os-chrome-item os-chrome-item-active os-type-meta">Grid</div>
                    <div className="os-chrome-item os-type-meta">List</div>
                    <div className="os-chrome-item os-type-meta">Newest</div>
                  </div>
                )}

                {style.className === 'os-chrome-item' && (
                  <div className="os-chrome-bar chrome-preview-bar">
                    <div className={`${style.className} os-type-nav`}>Store</div>
                    <div className={`${style.className} os-type-nav`}>Services</div>
                    <div className={`${style.className} os-type-nav`}>Resources</div>
                  </div>
                )}

                {style.className === 'os-chrome-item-active' && (
                  <div className="os-chrome-bar chrome-preview-bar">
                    <div className="os-chrome-item os-type-nav">Store</div>
                    <div className={`os-chrome-item ${style.className} os-type-nav`}>Browse</div>
                    <div className="os-chrome-item os-type-nav">Library</div>
                  </div>
                )}

                {style.className === 'os-chrome-icon' && (
                  <>
                    <div className={`${style.className} os-type-button`}>⌕</div>
                    <div className={`${style.className} os-type-button`}>N</div>
                    <div className={`${style.className} os-type-button`}>+</div>
                  </>
                )}

                {style.className === 'os-chrome-search' && (
                  <div className={`${style.className} chrome-preview-search os-type-body-small`}>
                    Search 44
                  </div>
                )}
              </div>
            </div>

            <div className="chrome-details">
              <div className="chrome-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="chrome-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="chrome-detail-row os-type-body-small">
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