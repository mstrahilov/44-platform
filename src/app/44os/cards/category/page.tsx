const categoryCardStyles = [
  {
    name: 'Category Card',
    specs: 'Default category tile · paper object · title, short copy, metadata',
    usage: 'Store category grids, services category grids, resources category grids, community categories.',
    variant: 'default',
  },
  {
    name: 'Category Icon Card',
    specs: 'Category tile with icon mark · stronger visual identity · paper object',
    usage: 'Browse categories, product categories, store hubs, dashboard shortcuts.',
    variant: 'icon',
  },
  {
    name: 'Category Poster Card',
    specs: 'Expressive category tile · dark/color poster surface · larger visual moment',
    usage: 'Featured category rows, homepage category highlights, editorial category sections.',
    variant: 'poster',
  },
  {
    name: 'Category Compact Card',
    specs: 'Compact category row · glass-compatible · small navigation shortcut',
    usage: 'Sidebars, dashboard rails, settings navigation, browse filters, compact category lists.',
    variant: 'compact',
  },
];

function CategoryCardDefault() {
  return (
    <article className="os-category-card">
      <div>
        <div className="os-category-card-title os-type-card-title">Music</div>
        <div className="os-category-card-copy os-type-body-small">
          Albums, releases, bonus material, stems, booklets, and creator editions.
        </div>
      </div>

      <div className="os-category-card-meta os-type-meta">124 items</div>
    </article>
  );
}

function CategoryIconCard() {
  return (
    <>
      <article className="os-category-card os-category-icon-card">
        <div className="os-category-icon">
          <img src="/icons/browse/music.svg" alt="" />
        </div>

        <div className="os-category-card-title os-type-section-title">
          Music
        </div>
      </article>

      <article className="os-category-card os-category-icon-card">
        <div className="os-category-icon">
          <img src="/icons/browse/apparel.svg" alt="" />
        </div>

        <div className="os-category-card-title os-type-section-title">
          Apparel
        </div>
      </article>
    </>
  );
}

function CategoryPosterCard() {
  return (
    <article className="os-category-poster-card">
      <div className="os-pill os-status-owned">Featured</div>

      <div>
        <div className="os-category-card-title os-type-section-title">Music</div>
        <div className="os-category-card-copy os-type-body-small">
          Releases, artwork, notes, and collectible digital experiences.
        </div>
      </div>
    </article>
  );
}

function CategoryCompactCard() {
  return (
    <div className="os-content-panel category-compact-shell">
      <article className="os-category-compact-card">
        <span className="os-type-sidebar-row">Music</span>
        <span className="os-type-meta">124</span>
      </article>

      <article className="os-category-compact-card">
        <span className="os-type-sidebar-row">Books</span>
        <span className="os-type-meta">48</span>
      </article>

      <article className="os-category-compact-card">
        <span className="os-type-sidebar-row">Assets</span>
        <span className="os-type-meta">92</span>
      </article>
    </div>
  );
}

function CategoryCardPreview({ variant }: { variant: string }) {
  if (variant === 'default') return <CategoryCardDefault />;
  if (variant === 'icon') return <CategoryIconCard />;
  if (variant === 'poster') return <CategoryPosterCard />;
  if (variant === 'compact') return <CategoryCompactCard />;

  return null;
}

export default function FortyOSCategoryCardsPage() {
  return (
    <main className="category-card-doc">
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

        .category-card-doc {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 18% 8%, rgba(255, 190, 120, 0.18), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.14), transparent 32%),
            var(--os-color-app-environment);
          color: var(--os-color-ink);
          font-family: var(--os-font-app);
        }

        .category-card-page {
          width: min(1120px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .category-card-header {
          margin-bottom: var(--os-space-9);
        }

        .category-card-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .category-card-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .category-card-description {
          margin: var(--os-space-4) 0 0;
          max-width: 800px;
          color: var(--os-color-ink-secondary);
        }

        .category-card-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .category-card-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .category-card-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .category-card-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 190, 120, 0.18), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.12), transparent 32%),
            rgba(255,255,255,.26);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .category-card-preview-row {
          display: flex;
          align-items: flex-start;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        .category-compact-shell {
          width: min(360px, 100%);
          display: grid;
          gap: var(--os-space-3);
        }

        .category-card-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .category-card-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .category-card-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .category-card-page {
            width: min(100% - 32px, 1120px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .category-card-sample {
            padding: var(--os-space-6);
          }

          .os-category-card,
          .os-category-poster-card {
            width: 100%;
          }

          .category-card-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="category-card-page">
        <header className="category-card-header">
          <div className="category-card-kicker os-type-eyebrow">44OS Cards</div>

          <h1 className="category-card-title os-type-page-title">44OS Category Cards</h1>

          <p className="category-card-description os-type-body">
            Category cards are navigation objects. They help users move through product
            categories, service categories, resource groups, community sections, dashboard
            shortcuts, and browse filters. Category cards should feel lighter than product
            cards because they represent destinations, not owned content objects.
          </p>
        </header>

        {categoryCardStyles.map((style) => (
          <section key={style.name} className="category-card-style">
            <h2 className="category-card-style-name os-type-section-title">{style.name}</h2>

            <div className="category-card-sample">
              <div className="category-card-preview-row">
                <CategoryCardPreview variant={style.variant} />
              </div>
            </div>

            <div className="category-card-details">
              <div className="category-card-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="category-card-detail-row os-type-body-small">
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