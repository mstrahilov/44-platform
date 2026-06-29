const typeStyles = [
  {
    name: 'Display',
    className: 'os-type-display',
    specs: '64px / 0.94 line height · weight 760 · tracking -0.064em',
    usage: 'Hero titles, flagship item pages, album detail heroes, major system moments.',
    sample: 'here comes the feeling',
  },
  {
    name: 'Page Title',
    className: 'os-type-page-title',
    specs: '40px / 1.0 line height · weight 760 · tracking -0.056em',
    usage: 'Main page titles such as Browse, Library, Dashboard, Settings, Creator Studio.',
    sample: 'Browse Store',
  },
  {
    name: 'Panel Title',
    className: 'os-type-panel-title',
    specs: '31px / 0.98 line height · weight 760 · tracking -0.052em',
    usage: 'Sidebar titles, inspector headings, focused panel titles, compact page headers.',
    sample: 'Browse',
  },
  {
    name: 'Section Title',
    className: 'os-type-section-title',
    specs: '22px / 1.12 line height · weight 740 · tracking -0.042em',
    usage: 'Section headers such as Tracks, Components, Downloads, Achievements, Related.',
    sample: 'Included with this release',
  },
  {
    name: 'Card Title',
    className: 'os-type-card-title',
    specs: '17px / 1.08 line height · weight 730 · tracking -0.038em',
    usage: 'Product cards, album cards, component cards, achievement cards, download cards.',
    sample: 'Digital Booklet',
  },
  {
    name: 'Sidebar Row',
    className: 'os-type-sidebar-row',
    specs: '16px / 1.2 line height · weight 740 · tracking -0.024em',
    usage: 'Sidebar navigation rows, browse category rows, library category rows.',
    sample: 'Experiences',
  },
  {
    name: 'Body',
    className: 'os-type-body',
    specs: '15px / 1.46 line height · weight 520 · tracking -0.01em',
    usage: 'Descriptions, paragraphs, item body copy, release notes, creator explanations.',
    sample:
      'A special 44 edition of the album with tracks, notes, artwork, achievements, and unlockable extras.',
  },
  {
    name: 'Body Small',
    className: 'os-type-body-small',
    specs: '13px / 1.45 line height · weight 520 · tracking -0.006em',
    usage: 'Inspector descriptions, helper text, small panel copy, compact explanations.',
    sample: 'Includes audio, downloads, achievements, and unlockable content.',
  },
  {
    name: 'Metadata',
    className: 'os-type-meta',
    specs: '12px / 1.35 line height · weight 560 · tracking 0',
    usage: 'Creator names, file metadata, timestamps, secondary labels, compact details.',
    sample: 'ØLSTEN · 12 tracks · 5 components',
  },
  {
    name: 'Button Label',
    className: 'os-type-button',
    specs: '14px / 1.15 line height · weight 800 · tracking -0.012em',
    usage: 'Primary actions, secondary actions, publish buttons, library actions.',
    sample: 'Add to Library',
  },
  {
    name: 'Navigation Label',
    className: 'os-type-nav',
    specs: '11px / 1.2 line height · weight 760 · tracking 0.13em',
    usage: 'Top navigation, chrome labels, compact system navigation.',
    sample: 'STORE',
  },
  {
    name: 'Eyebrow',
    className: 'os-type-eyebrow',
    specs: '11px / 1.2 line height · weight 800 · tracking 0.14em',
    usage: 'Small uppercase labels above titles, sections, panels, and system groups.',
    sample: 'MUSIC RELEASE',
  },
  {
    name: 'Status Pill',
    className: 'os-type-pill',
    specs: '11px / 1.2 line height · weight 760 · tracking 0.06em',
    usage: 'Included, Locked, Owned, Paid, Coming Soon, New, Completed, Downloaded.',
    sample: 'INCLUDED',
  },
];

export default function FortyOSTypographyPage() {
  return (
    <main
      style={{
  minHeight: '100vh',
  height: '100vh',
  overflowY: 'auto',
  overflowX: 'hidden',
  background: '#f7f7f4',
  color: '#151515',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
}}
    >
      <style>{`
        .nav-shell {
          display: none !important;
        }

        .app-main {
          height: auto !important;
          min-height: 100vh !important;
          overflow: visible !important;
          display: block !important;
        }

        .type-page {
          width: min(1040px, calc(100vw - 48px));
          margin: 0 auto;
          padding: 72px 0 96px;
        }

        .type-header {
          margin-bottom: 58px;
        }

        .type-kicker {
          margin-bottom: 12px;
          color: rgba(0,0,0,.42);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .type-title {
          margin: 0;
          color: #111;
          font-size: 48px;
          line-height: 1;
          font-weight: 780;
          letter-spacing: -0.055em;
        }

        .type-description {
          margin: 18px 0 0;
          max-width: 720px;
          color: rgba(0,0,0,.58);
          font-size: 16px;
          line-height: 1.55;
          font-weight: 540;
          letter-spacing: -0.012em;
        }

        .type-style {
          padding: 46px 0;
          border-top: 1px solid rgba(0,0,0,.1);
        }

        .type-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .type-style-name {
          margin: 0 0 18px;
          color: #111;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 760;
          letter-spacing: -0.04em;
        }

        .type-sample {
          border-radius: 12px;
          background: rgba(0,0,0,.045);
          padding: 28px 30px;
          overflow: hidden;
        }

        .type-details {
          margin-top: 16px;
          display: grid;
          gap: 8px;
        }

        .type-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 18px;
          color: rgba(0,0,0,.58);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 560;
          letter-spacing: -0.006em;
        }

        .type-detail-row strong {
          color: rgba(0,0,0,.88);
          font-weight: 760;
        }

        .type-class {
          display: inline-flex;
          justify-self: start;
          margin-top: 8px;
          min-height: 30px;
          align-items: center;
          padding: 0 11px;
          border-radius: 999px;
          background: rgba(255,255,255,.72);
          border: 1px solid rgba(0,0,0,.08);
          color: rgba(0,0,0,.62);
          font-size: 12px;
          line-height: 1;
          font-weight: 680;
          letter-spacing: -0.006em;
        }

        @media (max-width: 760px) {
          .type-page {
            width: min(100% - 32px, 1040px);
            padding: 42px 0 72px;
          }

          .type-title {
            font-size: 38px;
          }

          .type-sample {
            padding: 22px;
          }

          .type-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="type-page">
        <header className="type-header">
          <div className="type-kicker">44OS Foundation</div>

          <h1 className="type-title">44OS Typography</h1>

          <p className="type-description">
            These are the reusable text styles for the 44OS application interface.
            Every page, card, panel, button, navigation item, metadata row, and album
            component should pull from these roles instead of defining one-off typography.
          </p>
        </header>

        {typeStyles.map((style) => (
          <section key={style.name} className="type-style">
            <h2 className="type-style-name">{style.name}</h2>

            <div className="type-sample">
              <div className={style.className} style={{ color: '#202020' }}>
                {style.sample}
              </div>
            </div>

            <div className="type-details">
              <div className="type-detail-row">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="type-detail-row">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>

              <div className="type-detail-row">
                <strong>Class</strong>
                <span className="type-class">{style.className}</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}