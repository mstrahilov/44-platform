const panelStyles = [
  {
    name: 'System Page Panel',
    specs: 'Wide glass page container · grows with content · scrolls with the page',
    usage: 'Simple settings pages, account forms, checkout, submit product, submit service, submit resource.',
    variant: 'systemPanel',
  },
  {
    name: 'System Window Panel',
    specs: 'One-piece fixed glass window · lighter left rail · right content scrolls internally',
    usage: 'Settings, dashboard, account, creator dashboard, orders, payouts, analytics, product manager.',
    variant: 'systemWindow',
  },
  {
    name: 'Sidebar Panel',
    specs: 'Fixed left app panel · frosted glass · category/filter/navigation surface',
    usage: 'Browse filters, library navigation, category panels, creator builder side navigation.',
    variant: 'sidebar',
  },
  {
    name: 'Inspector Panel',
    specs: 'Fixed right app panel · frosted glass · actions, metadata, ownership, included items',
    usage: 'Product detail, item detail, album detail, resource detail, creator review panels.',
    variant: 'inspector',
  },
  {
    name: 'Content Panel',
    specs: 'Medium glass section · grouped content inside an app page',
    usage: 'Dashboard summaries, grouped settings blocks, analytics sections, creator tool sections.',
    variant: 'content',
  },
  {
    name: 'Floating Panel',
    specs: 'Small elevated glass panel · compact floating utility surface',
    usage: 'Popovers, quick menus, mini inspectors, contextual controls, small overlays.',
    variant: 'floating',
  },
  {
    name: 'Paper Reading Panel',
    specs: 'Paper surface over dimmed backdrop · text-focused · not glass',
    usage: 'Album notes, lyrics, booklets, credits, receipts, guides, reading views, content lightboxes.',
    variant: 'paper',
  },
  {
    name: 'Panel Section + Row',
    specs: 'Internal panel structure · section dividers · consistent row height and spacing',
    usage: 'Settings rows, dashboard rows, metadata rows, inspector lists, account preferences.',
    variant: 'sectionRow',
  },
];

function SystemPanelPreview() {
  return (
    <div className="os-system-panel panels-system-panel-preview">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-section-title">Account Settings</div>
        <div className="os-panel-section-copy os-type-body-small">
          A flowing page panel for system pages that need one clean container.
        </div>
      </div>

      <div className="os-panel-section">
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-body-small">Display name</span>
          <span className="os-panel-row-muted os-type-meta">Miro</span>
        </div>

        <div className="os-panel-row">
          <span className="os-type-body-small">Email preferences</span>
          <span className="os-panel-row-muted os-type-meta">Enabled</span>
        </div>
      </div>
    </div>
  );
}

function SystemWindowPreview() {
  return (
    <div className="os-system-window panels-system-window-preview">
      <aside className="os-system-window-rail">
        <div className="os-system-window-rail-title os-type-eyebrow">Dashboard</div>

        <div className="os-system-window-link os-system-window-link-active os-type-sidebar-row">
          Overview
        </div>
        <div className="os-system-window-link os-type-sidebar-row">Products</div>
        <div className="os-system-window-link os-type-sidebar-row">Orders</div>
        <div className="os-system-window-link os-type-sidebar-row">Payouts</div>
        <div className="os-system-window-link os-type-sidebar-row">Settings</div>
      </aside>

      <section className="os-system-window-content">
        <div className="os-panel-section">
          <div className="os-panel-section-title os-type-section-title">Overview</div>
          <div className="os-panel-section-copy os-type-body-small">
            The left rail is part of the same glass window, not a separate floating card.
            The right side changes when a section is selected.
          </div>
        </div>

        <div className="os-panel-section">
          <div className="os-panel-row os-panel-row-surface">
            <span className="os-type-body-small">Revenue</span>
            <span className="os-type-meta">$2,480</span>
          </div>

          <div className="os-panel-row">
            <span className="os-type-body-small">Pending orders</span>
            <span className="os-type-meta">12</span>
          </div>

          <div className="os-panel-row">
            <span className="os-type-body-small">Next payout</span>
            <span className="os-type-meta">Friday</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SidebarPanelPreview() {
  return (
    <aside className="os-sidebar-panel panels-sidebar-preview">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-section-title">Browse</div>
        <div className="os-panel-section-copy os-type-body-small">
          Fixed navigation and filter panel.
        </div>
      </div>

      <div className="os-panel-section">
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-sidebar-row">Music</span>
        </div>
        <div className="os-panel-row">
          <span className="os-type-sidebar-row">Books</span>
        </div>
        <div className="os-panel-row">
          <span className="os-type-sidebar-row">Assets</span>
        </div>
      </div>
    </aside>
  );
}

function InspectorPanelPreview() {
  return (
    <aside className="os-inspector-panel panels-inspector-preview">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-section-title">The Great Shadowsea</div>
        <div className="os-panel-section-copy os-type-body-small">ØLSTEN</div>
      </div>

      <div className="os-panel-section">
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-body-small">Price</span>
          <span className="os-type-meta">$24</span>
        </div>

        <div className="os-panel-row">
          <span className="os-type-body-small">Included</span>
          <span className="os-type-meta">12 items</span>
        </div>

        <button className="os-button os-button-primary" type="button">
          Add to Library
        </button>
      </div>
    </aside>
  );
}

function ContentPanelPreview() {
  return (
    <div className="os-content-panel panels-content-preview">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-section-title">Analytics Summary</div>
        <div className="os-panel-section-copy os-type-body-small">
          Content panels group information inside a larger app page.
        </div>
      </div>

      <div className="os-panel-section">
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-body-small">Visitors</span>
          <span className="os-type-meta">18,402</span>
        </div>
      </div>
    </div>
  );
}

function FloatingPanelPreview() {
  return (
    <div className="os-floating-panel">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-card-title">Quick Actions</div>
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-body-small">Share</span>
        </div>
        <div className="os-panel-row">
          <span className="os-type-body-small">Duplicate</span>
        </div>
      </div>
    </div>
  );
}

function PaperPanelPreview() {
  return (
    <div className="os-lightbox-backdrop">
      <article className="os-paper-panel">
        <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)' }}>
          Album Notes
        </div>

        <h3 className="os-type-panel-title" style={{ margin: 'var(--os-space-3) 0 0' }}>
          The Great Shadowsea
        </h3>

        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
          Paper panels are for focused reading. Lyrics, notes, booklets, credits, receipts,
          and long-form resources should open on paper, not glass.
        </p>

        <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
          The background can dim like a lightbox while the text stays readable and calm.
        </p>
      </article>
    </div>
  );
}

function SectionRowPreview() {
  return (
    <div className="os-content-panel panels-section-row-preview">
      <div className="os-panel-section">
        <div className="os-panel-section-title os-type-section-title">Panel Section</div>
        <div className="os-panel-section-copy os-type-body-small">
          Sections divide related content inside glass panels.
        </div>
      </div>

      <div className="os-panel-section">
        <div className="os-panel-row os-panel-row-surface">
          <span className="os-type-body-small">Panel Row Active</span>
          <span className="os-type-meta">On</span>
        </div>

        <div className="os-panel-row">
          <span className="os-type-body-small">Panel Row Default</span>
          <span className="os-panel-row-muted os-type-meta">Off</span>
        </div>
      </div>
    </div>
  );
}

function PanelPreview({ variant }: { variant: string }) {
  if (variant === 'systemPanel') return <SystemPanelPreview />;
  if (variant === 'systemWindow') return <SystemWindowPreview />;
  if (variant === 'sidebar') return <SidebarPanelPreview />;
  if (variant === 'inspector') return <InspectorPanelPreview />;
  if (variant === 'content') return <ContentPanelPreview />;
  if (variant === 'floating') return <FloatingPanelPreview />;
  if (variant === 'paper') return <PaperPanelPreview />;
  if (variant === 'sectionRow') return <SectionRowPreview />;

  return null;
}

export default function FortyOSPanelsPage() {
  return (
    <main className="panels-doc">
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

        .panels-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 190, 120, 0.20), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.14), transparent 32%),
            radial-gradient(circle at 50% 88%, rgba(120, 180, 120, 0.14), transparent 42%),
            var(--os-color-app-environment);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .panels-page {
          width: min(1180px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .panels-header {
          margin-bottom: var(--os-space-9);
        }

        .panels-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .panels-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .panels-description {
          margin: var(--os-space-4) 0 0;
          max-width: 840px;
          color: var(--os-color-ink-secondary);
        }

        .panels-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .panels-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .panels-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .panels-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 190, 120, 0.18), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.12), transparent 32%),
            rgba(255,255,255,.26);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .panels-preview-row {
          display: flex;
          align-items: flex-start;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .panels-system-panel-preview {
          width: min(860px, 100%);
          margin: 0;
          min-height: 320px;
        }

        .panels-system-window-preview {
          width: min(900px, 100%);
          height: 440px;
          min-height: 440px;
          margin: 0;
        }

        .panels-sidebar-preview,
        .panels-inspector-preview {
          height: 420px;
        }

        .panels-content-preview,
        .panels-section-row-preview {
          width: min(520px, 100%);
        }

        .panels-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .panels-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .panels-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 820px) {
          .panels-page {
            width: min(100% - 32px, 1180px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .panels-sample {
            padding: var(--os-space-6);
          }

          .panels-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }

          .os-system-window {
            grid-template-columns: 1fr;
            height: auto;
          }

          .os-system-window-rail {
            border-right: 0;
            border-bottom: 1px solid var(--os-panel-divider);
          }

          .os-sidebar-panel,
          .os-inspector-panel {
            width: 100%;
          }
        }
      `}</style>

      <div className="panels-page">
        <header className="panels-header">
          <div className="panels-kicker os-type-eyebrow">44OS Layout</div>

          <h1 className="panels-title os-type-page-title">44OS Panels</h1>

          <p className="panels-description os-type-body">
            Panels define how 44OS surfaces live on the page. Glass panels are used for
            system interface, navigation, inspectors, dashboards, and settings. Paper
            panels are reserved for reading, lyrics, notes, booklets, receipts, and
            focused content.
          </p>
        </header>

        {panelStyles.map((style) => (
          <section key={style.name} className="panels-style">
            <h2 className="panels-style-name os-type-section-title">{style.name}</h2>

            <div className="panels-sample">
              <div className="panels-preview-row">
                <PanelPreview variant={style.variant} />
              </div>
            </div>

            <div className="panels-details">
              <div className="panels-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="panels-detail-row os-type-body-small">
                <strong>Usage</strong>
                <span>{style.usage}</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}