const radiusStyles = [
  {
    name: 'Radius 1',
    token: '--os-radius-1',
    value: '6px',
    specs: 'Small radius · subtle rounding for tiny interface details',
    usage: 'Small chips, tiny labels, compact metadata containers, small visual accents.',
  },
  {
    name: 'Radius 2',
    token: '--os-radius-2',
    value: '10px',
    specs: 'Compact radius · calm rounding for small controls',
    usage: 'Small buttons, compact inputs, tiny cards, list thumbnails, menu rows.',
  },
  {
    name: 'Radius 3',
    token: '--os-radius-3',
    value: '14px',
    specs: 'Default control radius · rounded but still precise',
    usage: 'Buttons, inputs, sidebar rows, tab items, compact panel controls.',
  },
  {
    name: 'Radius 4',
    token: '--os-radius-4',
    value: '18px',
    specs: 'Default card radius · soft object shape',
    usage: 'Small cards, resource cards, component cards, library cards, content blocks.',
  },
  {
    name: 'Radius 5',
    token: '--os-radius-5',
    value: '22px',
    specs: 'Large card radius · stronger 44OS object shape',
    usage: 'Product cards, service cards, album cards, achievement cards, download cards.',
  },
  {
    name: 'Radius 6',
    token: '--os-radius-6',
    value: '26px',
    specs: 'Panel radius · stable frosted surface shape',
    usage: 'Sidebars, inspectors, dashboard panels, library panels, creator tool panels.',
  },
  {
    name: 'Radius 7',
    token: '--os-radius-7',
    value: '34px',
    specs: 'Large panel radius · softer environmental container',
    usage: 'Major app panels, modal surfaces, large empty states, feature containers.',
  },
  {
    name: 'Radius 8',
    token: '--os-radius-8',
    value: '44px',
    specs: 'Maximum regular radius · expressive large surface rounding',
    usage: 'Hero panels, large editorial surfaces, flagship app moments.',
  },
  {
    name: 'Pill Radius',
    token: '--os-radius-pill',
    value: '999px',
    specs: 'Fully rounded shape · capsule or circular controls',
    usage: 'Pills, badges, nav items, buttons, search controls, circular icon buttons.',
  },
  {
    name: 'Artwork Radius',
    token: '--os-radius-artwork',
    value: '16px',
    specs: 'Default artwork radius · object-like media rounding',
    usage: 'Album covers, product artwork, resource thumbnails, creator release images.',
  },
  {
    name: 'Avatar Radius',
    token: '--os-radius-avatar',
    value: '999px',
    specs: 'Circular image radius · identity shape',
    usage: 'User avatars, creator avatars, member images, profile controls.',
  },
];

export default function FortyOSRadiusPage() {
  return (
    <main className="radius-doc">
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

        .radius-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--os-color-canvas);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .radius-page {
          width: min(1040px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .radius-header {
          margin-bottom: var(--os-space-9);
        }

        .radius-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .radius-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .radius-description {
          margin: var(--os-space-4) 0 0;
          max-width: 720px;
          color: var(--os-color-ink-secondary);
        }

        .radius-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .radius-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .radius-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .radius-sample {
          border-radius: var(--os-radius-3, 14px);
          background: var(--os-color-sample-surface);
          padding: var(--os-space-7);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .radius-preview-row {
          display: flex;
          align-items: center;
          gap: var(--os-space-5);
          flex-wrap: wrap;
        }

        .radius-preview {
          width: 180px;
          height: 116px;
          background: var(--os-color-paper);
          border: 1px solid var(--os-color-paper-border);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.7),
            0 14px 34px rgba(0,0,0,.06);
        }

        .radius-preview-dark {
          width: 116px;
          height: 116px;
          background: var(--os-color-ink);
          border: 1px solid rgba(0,0,0,.12);
        }

        .radius-preview-panel {
          width: 240px;
          height: 116px;
          background: var(--os-color-frosted-panel);
          border: 1px solid var(--os-color-frosted-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .radius-value {
          color: var(--os-color-ink-secondary);
          font-weight: 700;
        }

        .radius-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .radius-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .radius-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .radius-page {
            width: min(100% - 32px, 1040px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .radius-sample {
            padding: var(--os-space-6);
          }

          .radius-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="radius-page">
        <header className="radius-header">
          <div className="radius-kicker os-type-eyebrow">44OS Foundation</div>

          <h1 className="radius-title os-type-page-title">44OS Radius</h1>

          <p className="radius-description os-type-body">
            These are the reusable corner-radius roles for the 44OS interface. Radius
            should describe the type of object being drawn: controls are tighter, cards
            are softer, panels are larger, and pills are fully rounded.
          </p>
        </header>

        {radiusStyles.map((style) => (
          <section key={style.name} className="radius-style">
            <h2 className="radius-style-name os-type-section-title">{style.name}</h2>

            <div className="radius-sample">
              <div className="radius-preview-row">
                <div
                  className="radius-preview"
                  style={{
                    borderRadius: `var(${style.token})`,
                  }}
                />

                <div
                  className="radius-preview-dark"
                  style={{
                    borderRadius: `var(${style.token})`,
                  }}
                />

                <div
                  className="radius-preview-panel"
                  style={{
                    borderRadius: `var(${style.token})`,
                  }}
                />

                <div className="radius-value os-type-body-small">
                  var({style.token}) · {style.value}
                </div>
              </div>
            </div>

            <div className="radius-details">
              <div className="radius-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>
                  {style.value} · {style.specs}
                </span>
              </div>

              <div className="radius-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="radius-detail-row os-type-body-small">
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