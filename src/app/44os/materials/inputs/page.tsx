const inputStyles = [
  {
    name: 'Input Field',
    className: 'os-input-field',
    specs: 'Default input · 44px height · soft paper-glass background · inset shadow',
    usage: 'Forms, settings fields, creator setup fields, checkout fields, account fields.',
    sample: 'Release title',
  },
  {
    name: 'Input Compact',
    className: 'os-input-field os-input-compact',
    specs: 'Compact input · 36px height · tighter radius · smaller internal spacing',
    usage: 'Dense panels, sidebars, table filters, compact dashboard controls.',
    sample: 'Filter',
  },
  {
    name: 'Input Large',
    className: 'os-input-field os-input-large',
    specs: 'Large input · 56px height · more comfortable touch target',
    usage: 'Important forms, creator onboarding, main setup fields, large search-like fields.',
    sample: 'Album name',
  },
  {
    name: 'Search Input',
    className: 'os-input-search',
    specs: 'Pill search input · 44px height · recessed shape · rounded chrome-adjacent control',
    usage: 'Store search, library search, command search, browse filtering.',
    sample: 'Search 44',
  },
  {
    name: 'Textarea',
    className: 'os-input-textarea',
    specs: 'Multiline text input · 132px minimum height · editable long-form field',
    usage: 'Descriptions, post bodies, artist notes, resource summaries, creator copy.',
    sample: 'Write a description...',
  },
  {
    name: 'Upload Well',
    className: 'os-input-upload',
    specs: 'Dropzone surface · dashed border · large recessed upload target',
    usage: 'Artwork upload, audio upload, files, booklets, downloads, creator assets.',
    sample: 'Drop files here',
  },
];

export default function FortyOSInputsPage() {
  return (
    <main className="inputs-doc">
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

        .inputs-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .inputs-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .inputs-header {
          margin-bottom: var(--os-space-9);
        }

        .inputs-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .inputs-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .inputs-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .inputs-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .inputs-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .inputs-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .inputs-sample {
          border-radius: var(--os-radius-3);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .inputs-preview-row {
          display: flex;
          align-items: center;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .inputs-preview-wrap {
          width: min(460px, 100%);
        }

        .inputs-preview-label {
          margin-bottom: var(--os-space-2);
          color: var(--os-color-ink-muted);
        }

        .inputs-fake-textarea {
          display: flex;
          align-items: flex-start;
        }

        .inputs-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .inputs-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .inputs-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .inputs-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .inputs-sample {
            padding: var(--os-space-6);
          }

          .inputs-preview-wrap {
            width: 100%;
          }

          .inputs-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="inputs-page">
        <header className="inputs-header">
          <div className="inputs-kicker os-type-eyebrow">44OS Materials</div>

          <h1 className="inputs-title os-type-page-title">44OS Inputs</h1>

          <p className="inputs-description os-type-body">
            Inputs are where users enter information into 44. They should feel calm,
            readable, and tactile. Search can be pill-shaped and chrome-adjacent, while
            forms should feel stable, recessed, and easy to scan.
          </p>
        </header>

        {inputStyles.map((style) => (
          <section key={style.name} className="inputs-style">
            <h2 className="inputs-style-name os-type-section-title">{style.name}</h2>

            <div className="inputs-sample">
              <div className="inputs-preview-row">
                <div className="inputs-preview-wrap">
                  <div className="inputs-preview-label os-type-meta">EXAMPLE</div>

                  {style.className.includes('textarea') ? (
                    <div className={`${style.className} inputs-fake-textarea os-type-body-small`}>
                      {style.sample}
                    </div>
                  ) : style.className.includes('upload') ? (
                    <div className={`${style.className} os-type-body-small`}>
                      {style.sample}
                    </div>
                  ) : (
                    <div className={`${style.className} os-type-body-small`}>
                      {style.sample}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="inputs-details">
              <div className="inputs-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="inputs-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="inputs-detail-row os-type-body-small">
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