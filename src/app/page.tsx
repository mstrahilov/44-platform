'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref } from '@/lib/products';
import { PageShell } from '@/components/Ui';

const CATEGORY_ICON_MAP: Record<string, string> = {
  Music: '/icons/browse/music.svg',
  Experiences: '/icons/browse/games.svg',
  Books: '/icons/browse/books.svg',
  Apparel: '/icons/browse/apparel.svg',
  Assets: '/icons/browse/assets.svg',
};

export default function StorePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('year', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      setProducts(data ?? []);
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchOwnedItems(userId: string) {
      const { data } = await supabase
        .from('library_items')
        .select('product_id')
        .eq('user_id', userId);

      setOwnedProductIds((data ?? []).map(item => item.product_id).filter(Boolean));
    }

    if (user) {
      fetchOwnedItems(user.id);
    } else {
      Promise.resolve().then(() => setOwnedProductIds([]));
    }
  }, [user]);

  const catalog = products;
  const categories = useMemo(() => {
    return Array.from(new Set(catalog.map(product => product.category).filter(Boolean)));
  }, [catalog]);

  const musicProducts = catalog.filter(product => product.category === 'Music').slice(0, 10);
  const apparelProducts = catalog.filter(product => product.category === 'Apparel').slice(0, 10);

  return (
    <PageShell>
      <style>{`
        .store44-page {
          display: grid;
          gap: var(--os-space-10);
        }

        .store44-hero {
          position: relative;
          min-height: 400px;
          border-radius: var(--os-radius-8);
          overflow: hidden;
          background: var(--os-paper-bg);
          border: 1px solid var(--os-paper-border);
          box-shadow: var(--os-paper-card-shadow), var(--os-paper-highlight);
          color: var(--os-color-ink);
          isolation: isolate;
        }

        .store44-hero-content {
          position: relative;
          z-index: 2;
          min-height: 400px;
          padding: var(--os-space-10);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .store44-hero-title {
          max-width: 700px;
          margin: 0;
          color: var(--os-color-ink);
        }

        .store44-hero-copy {
          max-width: 620px;
          margin: var(--os-space-4) 0 0;
          color: var(--os-color-ink-secondary);
        }

        .store44-section {
          display: grid;
          gap: var(--os-space-5);
        }

        .store44-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--os-space-5);
        }

        .store44-section-title {
          margin: 0;
          color: rgba(255,255,255,.94);
        }

        .store44-section-action {
          color: #fff;
          background: rgba(255,255,255,.16);
          border-color: rgba(255,255,255,.24);
          box-shadow: var(--os-shadow-2), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
          -webkit-backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
        }

        .store44-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: var(--os-card-gap);
        }

        .store44-category-card {
          width: 100%;
        }

        .store44-product-shelf {
          display: flex;
          gap: var(--os-card-gap);
          overflow-x: auto;
          padding: var(--os-space-2) 0 var(--os-space-5);
          scroll-snap-type: x proximity;
        }

        .store44-product-shelf::-webkit-scrollbar {
          height: 8px;
        }

        .store44-product-shelf::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.16);
          border-radius: var(--os-radius-pill);
        }

        .store44-product-shelf-item {
          flex: 0 0 auto;
          scroll-snap-align: start;
        }

        .store44-product-card-link {
          color: inherit;
          text-decoration: none;
          display: block;
        }

        .store44-product-card {
          position: relative;
        }

        .store44-product-art {
          position: relative;
          overflow: hidden;
        }

        .store44-product-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .store44-product-card .os-product-card-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .store44-product-card .os-product-card-creator {
          min-height: 18px;
        }

        .store44-product-card-glass {
          background: var(--os-glass-panel-bg);
          border-color: var(--os-glass-panel-border);
          box-shadow: var(--os-glass-shadow), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          -webkit-backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
        }

        .store44-product-card-glass .os-product-card-title,
        .store44-product-card-glass .os-product-card-price {
          color: rgba(255,255,255,.96);
        }

        .store44-product-card-glass .os-product-card-creator {
          color: rgba(255,255,255,.68);
        }

        .store44-product-card-glass .os-product-card-art {
          border-bottom-color: rgba(255,255,255,.18);
        }

        .store44-product-card-poster {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: #000;
          border-color: rgba(255,255,255,.18);
          box-shadow: var(--os-shadow-card);
        }

        .store44-product-card-poster .store44-apparel-poster-art {
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-bottom: 0;
          background:
            linear-gradient(180deg, rgba(255,255,255,.26), rgba(0,0,0,.88)),
            var(--os-product-art-bg);
        }

        .store44-product-card-poster .store44-apparel-poster-art::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0) 48%,
            rgba(0,0,0,.34) 76%,
            rgba(0,0,0,.88) 100%
          );
          pointer-events: none;
        }

        .store44-product-card-poster .store44-apparel-poster-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .store44-product-card-poster .os-product-card-body {
          position: relative;
          z-index: 2;
          padding: var(--os-space-4) var(--os-product-card-pad) 0;
          gap: var(--os-space-1);
          background: #000;
        }

        .store44-product-card-poster .os-product-card-title {
          color: #fff;
          max-width: 230px;
        }

        .store44-product-card-poster .os-product-card-creator {
          color: rgba(255,255,255,.82);
          opacity: 1;
        }

        .store44-product-card-poster .os-product-card-footer {
          position: relative;
          z-index: 2;
          padding-top: var(--os-space-4);
          background: #000;
        }

        .store44-product-card-poster .os-product-card-price {
          color: #fff;
        }

        .store44-empty-panel {
          padding: var(--os-space-7);
          border-radius: var(--os-radius-6);
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.72);
        }

        @media (max-width: 760px) {
          .store44-hero {
            min-height: 340px;
          }

          .store44-hero-content {
            min-height: 340px;
            padding: var(--os-space-7);
          }

          .store44-section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .store44-category-grid {
            grid-template-columns: 1fr;
          }

          .store44-product-card {
            width: 240px;
          }
        }
      `}</style>

      <div className="store44-page">
        <StoreHero />

        {categories.length > 0 && (
          <section className="store44-section" aria-label="Product categories">
            <div className="store44-section-head">
              <h2 className="store44-section-title os-type-panel-title">
                Browse by Category
              </h2>
            </div>

            <div className="store44-category-grid">
              {categories.map(category => (
                <CategoryTile key={category} category={category} />
              ))}
            </div>
          </section>
        )}

        {musicProducts.length > 0 && (
          <section className="store44-section">
            <SectionHeading title="Explore Music" href={browseHref({ category: 'Music' })} />

            <ProductShelf
              products={musicProducts}
              ownedProductIds={ownedProductIds}
              cardVariant="glass"
            />
          </section>
        )}

        {apparelProducts.length > 0 && (
          <section className="store44-section">
            <SectionHeading title="Explore Apparel" href={browseHref({ category: 'Apparel' })} />

            <ProductShelf
              products={apparelProducts}
              ownedProductIds={ownedProductIds}
              cardVariant="glass"
            />
          </section>
        )}
      </div>
    </PageShell>
  );
}

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="store44-section-head">
      <h2 className="store44-section-title os-type-panel-title">{title}</h2>

      {href && (
        <Link className="os-button os-button-glass os-button-compact store44-section-action" href={href}>
          View All
        </Link>
      )}
    </div>
  );
}

function StoreHero() {
  return (
    <section className="store44-hero">
      <div className="store44-hero-content">
        <h1 className="store44-hero-title os-type-display">Store</h1>

        <p className="store44-hero-copy os-type-body">
          Explore music, apparel, digital goods, and releases from creators on 44.
        </p>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: string }) {
  const icon = CATEGORY_ICON_MAP[category] ?? '/icons/browse/grid.svg';

  return (
    <Link
      href={browseHref({ category })}
      className="os-category-card os-category-icon-card store44-category-card"
    >
      <div className="os-category-icon">
        <img src={icon} alt="" />
      </div>

      <div className="os-category-card-title os-type-section-title">
        {category}
      </div>
    </Link>
  );
}

function ProductShelf({
  products,
  ownedProductIds,
  cardVariant = 'artwork',
}: {
  products: Product[];
  ownedProductIds: string[];
  cardVariant?: 'artwork' | 'glass' | 'poster';
}) {
  const visibleProducts = products.slice(0, 10);

  if (visibleProducts.length === 0) {
    return (
      <div className="store44-empty-panel os-type-body-small">
        No products are available in this section yet.
      </div>
    );
  }

  return (
    <div className="store44-product-shelf">
      {visibleProducts.map(product => (
        <div key={product.id} className="store44-product-shelf-item">
          <StoreProductCard
            product={product}
            owned={ownedProductIds.includes(product.id)}
            variant={cardVariant}
          />
        </div>
      ))}
    </div>
  );
}

function StoreProductCard({
  product,
  owned,
  variant = 'artwork',
}: {
  product: Product;
  owned: boolean;
  variant?: 'artwork' | 'glass' | 'poster';
}) {
  const href = `/product/${product.slug || product.id}`;
  const image = product.cover_url || product.hero_url;
  const creator = getCreatorName(product);
  const price = getProductPrice(product);

  if (variant === 'poster') {
    const posterImage = image || '/poster.png';

    return (
      <Link href={href} className="store44-product-card-link">
        <article className="os-product-card store44-product-card store44-product-card-poster">
          <div className="store44-apparel-poster-art">
            <img src={posterImage} alt="" />
          </div>

          <div className="os-product-card-body">
            <div className="os-product-card-title os-type-card-title">
              {product.title}
            </div>

            <div className="os-product-card-creator os-type-meta">
              {creator}
            </div>
          </div>

          <div className="os-product-card-footer">
            {owned ? (
              <span className="os-pill os-status-owned os-product-card-value-pill">
                Owned
              </span>
            ) : (
              <div className="os-product-card-price os-type-section-title">
                {price}
              </div>
            )}

            <span className="os-product-card-pill-button os-product-card-pill-light">
              View
            </span>
          </div>
        </article>
      </Link>
    );
  }

  const cardClassName =
    variant === 'glass'
      ? 'os-product-card os-product-artwork-card store44-product-card store44-product-card-glass'
      : 'os-product-card os-product-artwork-card store44-product-card';

  return (
    <Link href={href} className="store44-product-card-link">
      <article className={cardClassName}>
        <div className="os-product-card-art store44-product-art">
          {image && <img src={image} alt="" />}
        </div>

        <div className="os-product-card-body">
          <div className="os-product-card-title os-type-card-title">
            {product.title}
          </div>

          <div className="os-product-card-creator os-type-meta">
            {creator}
          </div>
        </div>

        <div className="os-product-card-footer">
          {owned ? (
            <span className="os-pill os-status-owned os-product-card-value-pill">
              Owned
            </span>
          ) : (
            <div className="os-product-card-price os-type-section-title">
              {price}
            </div>
          )}

          <span className="os-product-card-pill-button os-product-card-pill-light">
            View
          </span>
        </div>
      </article>
    </Link>
  );
}

function getCreatorName(product: Product) {
  const productWithCreator = product as Product & {
    creator?: string | null;
    creator_name?: string | null;
    artist?: string | null;
  };

  return (
    productWithCreator.creator ||
    productWithCreator.creator_name ||
    productWithCreator.artist ||
    '44 Creator'
  );
}

function getProductPrice(product: Product) {
  const productWithPrice = product as Product & {
    price?: number | string | null;
    price_cents?: number | null;
  };

  if (typeof productWithPrice.price === 'string') {
    const rawPrice = productWithPrice.price.trim();
    const numericPrice = Number(rawPrice.replace('$', ''));

    if (rawPrice && !Number.isNaN(numericPrice) && numericPrice === 0) {
      return 'FREE';
    }

    if (rawPrice) {
      return rawPrice.startsWith('$') ? rawPrice : `$${rawPrice}`;
    }
  }

  if (typeof productWithPrice.price === 'number') {
    return productWithPrice.price === 0 ? 'FREE' : `$${productWithPrice.price}`;
  }

  if (typeof productWithPrice.price_cents === 'number') {
    return productWithPrice.price_cents === 0
      ? 'FREE'
      : `$${Math.round(productWithPrice.price_cents / 100)}`;
  }

  return '$24';
}
