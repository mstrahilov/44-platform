const productCardStyles = [
  {
    name: 'Artwork Product Card',
    specs: 'Square artwork · title · creator · price left · view button right',
    usage: 'Default music, book, apparel, asset, and experience browse cards.',
    variant: 'artwork',
  },
  {
    name: 'Color Poster Product Card',
    specs: 'Image-to-color poster treatment · lower text stack · price and action',
    usage: 'Featured visual products, books, apparel drops, assets, and colorful releases.',
    variant: 'colorPoster',
  },
  {
    name: 'Paper Info Product Card',
    specs: 'Square color/image area · paper body · short description · price and action',
    usage: 'Products that need a short two-to-three-line explanation on the card.',
    variant: 'paperInfo',
  },
  {
    name: 'Gradient Poster Product Card',
    specs: 'Dark-to-accent poster treatment · clear image top · frosted blur bottom · title and creator near top',
    usage: 'Products with strong visuals, transparent PNG assets, gear, apparel, bags, and objects.',
    variant: 'gradientObject',
  },
];

function ProductFooter({ light = false }: { light?: boolean }) {
  return (
    <div className="os-product-card-footer">
      <div className="os-product-card-price os-type-section-title">$24</div>

      <span
        className={
          light
            ? 'os-product-card-pill-button os-product-card-pill-light'
            : 'os-product-card-pill-button os-product-card-pill-dark'
        }
      >
        View
      </span>
    </div>
  );
}

function ArtworkProductCard() {
  return (
    <article className="os-product-card os-product-artwork-card">
      <div className="os-product-card-art" />

      <div className="os-product-card-body">
        <div className="os-product-card-title os-type-card-title">
          The Great Shadowsea
        </div>

        <div className="os-product-card-creator os-type-meta">
          ØLSTEN
        </div>
      </div>

      <ProductFooter />
    </article>
  );
}

function ColorPosterProductCard() {
  return (
    <article className="os-product-card os-product-color-poster-card">
      <div className="os-product-poster-image-layer" />

      <div className="os-product-card-body">
        <div className="os-product-card-title os-type-section-title">
          The Great Shadowsea
        </div>

        <div className="os-product-card-creator os-type-meta">
          ØLSTEN
        </div>
      </div>

      <ProductFooter light />
    </article>
  );
}

function PaperInfoProductCard() {
  return (
    <article className="os-product-card os-product-paper-info-card">
      <div className="os-product-card-art" />

      <div className="os-product-card-body">
        <div className="os-product-card-title os-type-card-title">
          The Great Shadowsea
        </div>

        <div className="os-product-card-description os-type-body-small">
          A complete 44 edition with album notes, creator context, artwork, and bonus
          material in one collectible release.
        </div>
      </div>

      <ProductFooter />
    </article>
  );
}

function GradientPosterProductCard() {
  return (
    <article className="os-product-card os-product-gradient-object-card">
      <div className="os-product-poster-image-layer" />

      <div className="os-product-card-body">
        <div className="os-product-card-title os-type-card-title">
          The Great Shadowsea
        </div>

        <div className="os-product-card-creator os-type-meta">
          ØLSTEN
        </div>
      </div>

      <ProductFooter light />
    </article>
  );
}

function ProductCardPreview({ variant }: { variant: string }) {
  if (variant === 'artwork') {
    return <ArtworkProductCard />;
  }

  if (variant === 'colorPoster') {
    return <ColorPosterProductCard />;
  }

  if (variant === 'paperInfo') {
    return <PaperInfoProductCard />;
  }

  if (variant === 'gradientObject') {
    return <GradientPosterProductCard />;
  }

  return null;
}

export default function FortyOSProductCardPage() {
  return (
    <main className="product-card-doc">
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

        .product-card-doc {
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

        .product-card-page {
          width: min(1120px, calc(100vw - (var(--os-page-pad) * 2)));
          margin: 0 auto;
          padding: var(--os-space-10) 0 var(--os-space-10);
        }

        .product-card-header {
          margin-bottom: var(--os-space-9);
        }

        .product-card-kicker {
          margin-bottom: var(--os-space-3);
          color: var(--os-color-ink-muted);
        }

        .product-card-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .product-card-description {
          margin: var(--os-space-4) 0 0;
          max-width: 780px;
          color: var(--os-color-ink-secondary);
        }

        .product-card-style {
          padding: var(--os-space-9) 0;
          border-top: 1px solid var(--os-color-hairline);
        }

        .product-card-style:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .product-card-style-name {
          margin: 0 0 var(--os-space-5);
          color: var(--os-color-ink);
        }

        .product-card-sample {
          border-radius: var(--os-radius-3);
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 190, 120, 0.18), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(130, 170, 255, 0.12), transparent 32%),
            rgba(255,255,255,.26);
          padding: var(--os-space-8);
          overflow: hidden;
          border: 1px solid var(--os-color-paper-border);
        }

        .product-card-preview-row {
          display: flex;
          align-items: flex-start;
          gap: var(--os-space-6);
          flex-wrap: wrap;
        }

        /*
          Safety containment:
          This keeps poster image layers inside the card only.
          If the global CSS ever misses a positioning rule, this page still behaves.
        */

        .product-card-doc .os-product-color-poster-card,
        .product-card-doc .os-product-gradient-object-card {
          position: relative !important;
          overflow: hidden !important;
          isolation: isolate;
        }

        .product-card-doc .os-product-poster-image-layer {
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          background-image: var(--os-product-poster-image);
          background-size: cover;
          background-position: center;
          filter: saturate(1.08);
          opacity: 0.74;
          pointer-events: none;
        }

        .product-card-doc .os-product-poster-image-layer::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: var(--os-product-poster-image);
          background-size: cover;
          background-position: center;
          filter: blur(22px) saturate(1.16);
          transform: scale(1.08);
          opacity: 0.92;
          -webkit-mask-image: linear-gradient(
            180deg,
            transparent 0%,
            transparent 42%,
            rgba(0, 0, 0, 0.36) 62%,
            #000 100%
          );
          mask-image: linear-gradient(
            180deg,
            transparent 0%,
            transparent 42%,
            rgba(0, 0, 0, 0.36) 62%,
            #000 100%
          );
        }

        .product-card-doc .os-product-color-poster-card::after,
        .product-card-doc .os-product-gradient-object-card::after {
          z-index: 1;
        }

        .product-card-doc .os-product-color-poster-card .os-product-card-body,
        .product-card-doc .os-product-color-poster-card .os-product-card-footer,
        .product-card-doc .os-product-gradient-object-card .os-product-card-body,
        .product-card-doc .os-product-gradient-object-card .os-product-card-footer {
          position: relative;
          z-index: 2;
        }

        .product-card-details {
          margin-top: var(--os-space-4);
          display: grid;
          gap: var(--os-space-2);
        }

        .product-card-detail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: var(--os-shell-gap);
          color: var(--os-color-ink-secondary);
        }

        .product-card-detail-row strong {
          color: var(--os-color-ink);
          font-weight: 760;
        }

        @media (max-width: 760px) {
          .product-card-page {
            width: min(100% - 32px, 1120px);
            padding: var(--os-space-8) 0 var(--os-space-10);
          }

          .product-card-sample {
            padding: var(--os-space-6);
          }

          .os-product-card {
            width: 100%;
          }

          .product-card-detail-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }
        }
      `}</style>

      <div className="product-card-page">
        <header className="product-card-header">
          <div className="product-card-kicker os-type-eyebrow">44OS Cards</div>

          <h1 className="product-card-title os-type-page-title">44OS Product Cards</h1>

          <p className="product-card-description os-type-body">
            Product cards are small marketplace objects. The default version keeps the
            artwork clean and square. Poster versions use a clear image layer at the top,
            then gradually blur into a frosted image treatment behind the text. Price
            always sits in the lower-left value position, with a clear View action on the
            lower-right.
          </p>
        </header>

        {productCardStyles.map((style) => (
          <section key={style.name} className="product-card-style">
            <h2 className="product-card-style-name os-type-section-title">{style.name}</h2>

            <div className="product-card-sample">
              <div className="product-card-preview-row">
                <ProductCardPreview variant={style.variant} />
              </div>
            </div>

            <div className="product-card-details">
              <div className="product-card-detail-row os-type-body-small">
                <strong>Specs</strong>
                <span>{style.specs}</span>
              </div>

              <div className="product-card-detail-row os-type-body-small">
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