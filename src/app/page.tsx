'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { PageShell, SectionHeader } from '@/components/Ui';

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
  const featured = catalog.find(product => product.featured) ?? catalog[0];
  const newest = catalog.slice(0, 10);

  const categoryCounts = useMemo(() => {
    return Array.from(new Set(catalog.map(product => product.category).filter(Boolean))).map(category => ({
      category,
      count: catalog.filter(product => product.category === category).length,
      product: catalog.find(product => product.category === category),
    })).filter(item => item.count > 0);
  }, [catalog]);

  return (
    <PageShell>
        {featured && (
          <StoreHero
            product={featured}
            owned={ownedProductIds.includes(featured.id)}
          />
        )}

        <section>
          <SectionHeader title="Explore Products" href="/browse" />
          <div className="store-category-grid">
            {categoryCounts.map(item => (
              <CategoryTile key={item.category} category={item.category} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="NEW ARRIVALS" href="/browse" />
          <ProductShelf products={newest} ownedProductIds={ownedProductIds} />
        </section>

        <section>
          <SectionHeader title="EXPLORE MUSIC" href={browseHref({ category: 'Music' })} />
          <ProductShelf
            products={catalog.filter(product => product.category === 'Music')}
            ownedProductIds={ownedProductIds}
          />
        </section>

        <section>
          <SectionHeader title="EXPLORE APPAREL" href={browseHref({ category: 'Apparel' })} />
          <ProductShelf
            products={catalog.filter(product => product.category === 'Apparel')}
            ownedProductIds={ownedProductIds}
          />
        </section>
    </PageShell>
  );
}

function StoreHero({ product }: { product: Product; owned: boolean }) {
  const heroImage = product.hero_url || product.cover_url;

  return (
    <section className="store-hero-shell">
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.035)',
          minHeight: 460,
        }}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(8,8,14,0.84), rgba(8,8,14,0.42) 48%, rgba(8,8,14,0.10)), linear-gradient(0deg, rgba(8,8,14,0.84), rgba(8,8,14,0.06) 58%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: 460,
            padding: '52px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(40px, 4.5vw, 60px)',
              maxWidth: 740,
              fontWeight: 760,
              letterSpacing: '-0.045em',
              lineHeight: 0.96,
              color: '#fff',
              marginBottom: 16,
            }}
          >
            {product.title}
          </h1>

          <p
            style={{
              maxWidth: 640,
              fontSize: 17,
              fontWeight: 520,
              color: 'rgba(255,255,255,0.62)',
              lineHeight: 1.55,
              marginBottom: 28,
            }}
          >
            {product.feature_description ||
              product.description ||
              `${product.product_type} by ${product.creator}.`}
          </p>

          <Link className="btn-primary" href={`/product/${product.slug || product.id}`}>
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: string }) {
  const icon = category.toLowerCase().replace(/\s+/g, '-');

  return (
    <Link
      href={browseHref({ category })}
      style={{
        minHeight: 118,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.09)',
        background: 'rgba(255,255,255,0.035)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
        padding: '20px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <img
        src={`/icons/${icon}.svg`}
        alt=""
        style={{
          width: 40,
          height: 40,
          opacity: 0.92,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
        }}
      >
        {category}
      </div>
    </Link>
  );
}



function ProductShelf({ products, ownedProductIds }: { products: Product[]; ownedProductIds: string[] }) {
  return (
    <div className="product-shelf">
      {products.map(product => (
        <div key={product.id} className="product-shelf-item">
          <ProductCard product={product} owned={ownedProductIds.includes(product.id)} />
        </div>
      ))}
    </div>
  );
}
