const paperStyles = [
  {
    name: 'Paper',
    className: 'os-paper',
    specs: 'Default paper material · warm off-white · soft border · physical object shadow',
    usage: 'Readable content surfaces, simple object cards, documentation panels, quiet containers.',
  },
  {
    name: 'Paper Soft',
    className: 'os-paper-soft',
    specs: 'Softer paper material · slightly cooler and lower contrast · reduced elevation',
    usage: 'Secondary cards, neutral blocks, helper panels, low-emphasis content objects.',
  },
  {
    name: 'Paper Warm',
    className: 'os-paper-warm',
    specs: 'Warm paper material · slightly creamier · editorial and music-friendly',
    usage: 'Album notes, booklets, artist messages, editorial cards, storytelling surfaces.',
  },
  {
    name: 'Paper Card',
    className: 'os-paper-card',
    specs: 'Object card material · paper body · stronger card shadow · clipped artwork area',
    usage: 'Product cards, resource cards, album cards, component cards, achievement cards.',
  },
  {
    name: 'Paper Art',
    className: 'os-paper-art',
    specs: 'Artwork placeholder material · subtle gradient · sits inside paper cards',
    usage: 'Product artwork zones, album covers, resource thumbnails, download previews.',
  },
  {
    name: 'Paper Recessed',
    className: 'os-paper-recessed',
    specs: 'Inset paper well · subtle interior shadow · quieter than glass recessed inputs',
    usage: 'Metadata wells, small code fields, card detail areas, document preview regions.',
  },
];

export default function FortyOSPaperPage() {
  return (
    <main className="paper-doc">
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

        .paper-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 190, 120, 0.20), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.12), transparent 32%),
            var(--os-color-app-environment);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .paper-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .paper-header {
          margin-bottom: var(--os-space-9);
        }

        .paper-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .paper-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .paper-description {
          margin: var(--os-space-4) 0 0;
          max-width: 760px;
          color: var(--os-color-ink-secondary);
        }

        .paper-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .paper-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .paper-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .paper-sample {
          border-radius: var(--os-radius-3);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .paper-preview-row {
          display: flex;
          align-items: stretch;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .paper-preview {
          width: 300px;
          min-height: 190px;
          padding: var(--os-panel-pad);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .paper-card-preview {
          width: 300px;
          min-height: 260px;
          display: flex;
          flex-direction: column;
        }

        .paper-card-art {
          min-height: 150px;
          display: grid;
          place-items: center;
          color: var(--os-paper-text-muted);
        }

        .paper-card-body {
          padding: var(--os-card-pad);
        }

        .paper-recessed-preview {
          width: 320px;
          min-height: 78px;
          padding: var(--os-space-4);
          display: flex;
          align-items: center;
          color: var(--os-paper-text-secondary);
        }

        .paper-preview-title {
          color: var(--os-paper-text);
        }

        .paper-preview-copy {
          margin-top: var(--os-space-2);
          color: var(--os-paper-text-secondary);
        }

        .paper-preview-meta {
          color: var(--os-paper-text-muted);
        }

        .paper-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .paper-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .paper-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .paper-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .paper-sample {
            padding: var(--os-space-6);
          }

          .paper-preview,
          .paper-card-preview,
          .paper-recessed-preview {
            width: 100%;
          }

          .paper-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="paper-page">
        <header className="paper-header">
          <div className="paper-kicker os-type-eyebrow">44OS Materials</div>

          <h1 className="paper-title os-type-page-title">44OS Paper</h1>

          <p className="paper-description os-type-body">
            Paper is used for content objects. Unlike glass, paper should feel readable,
            tangible, and stable. Product cards, album cards, resources, achievements,
            notes, booklets, and downloads should feel like objects placed on top of the
            environment.
          </p>
        </header>

        {paperStyles.map((style) => (
          <section key={style.name} className="paper-style">
            <h2 className="paper-style-name os-type-section-title">{style.name}</h2>

            <div className="paper-sample">
              <div className="paper-preview-row">
                {style.className === 'os-paper-card' ? (
                  <div className={style.className + ' paper-card-preview'}>
                    <div className="os-paper-art paper-card-art os-type-meta">
                      ARTWORK
                    </div>

                    <div className="paper-card-body">
                      <div className="paper-preview-title os-type-card-title">
                        Digital Booklet
                      </div>
                      <div className="paper-preview-copy os-type-body-small">
                        A readable content object with artwork, metadata, and a clear card body.
                      </div>
                    </div>
                  </div>
                ) : style.className === 'os-paper-art' ? (
                  <div className="os-paper-card paper-card-preview">
                    <div className={style.className + ' paper-card-art os-type-meta'}>
                      ARTWORK
                    </div>

                    <div className="paper-card-body">
                      <div className="paper-preview-title os-type-card-title">
                        Artwork Area
                      </div>
                      <div className="paper-preview-copy os-type-body-small">
                        Artwork belongs inside the object, not behind the whole interface.
                      </div>
                    </div>
                  </div>
                ) : style.className === 'os-paper-recessed' ? (
                  <div className={style.className + ' paper-recessed-preview os-type-body-small'}>
                    Metadata, download details, or compact supporting information.
                  </div>
                ) : (
                  <div className={style.className + ' paper-preview'}>
                    <div>
                      <div className="paper-preview-title os-type-card-title">
                        Album Notes
                      </div>
                      <div className="paper-preview-copy os-type-body-small">
                        Paper is for readable content that should feel like a real object.
                      </div>
                    </div>

                    <div className="paper-preview-meta os-type-meta">
                      PAPER MATERIAL
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="paper-details">
              <div className="paper-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="paper-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="paper-detail-row os-type-body-small">
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