'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, FALLBACK_PRODUCTS } from '@/lib/products';
import { PageShell, SectionHeader } from '@/components/Ui';

const STORE_CATEGORIES = ['Music', 'Games', 'Books', 'Interactive', 'Sample Packs', 'Tools', 'Apparel'];

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

  const catalog = products.length > 0 ? products : FALLBACK_PRODUCTS;
  const featured = catalog.find(product => product.featured) ?? catalog[0];
  const freeProducts = catalog.filter(product => product.is_free).slice(0, 6);
  const newest = catalog.slice(0, 10);
  const creatorFeatures = Array.from(new Map(catalog.map(product => [product.creator, product])).values()).slice(0, 2);

  const categoryCounts = useMemo(() => {
    return STORE_CATEGORIES.map(category => ({
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
          <SectionHeader title="Explore 44" href="/browse" />
          <div className="store-category-grid">
            {categoryCounts.map(item => (
              <CategoryTile key={item.category} category={item.category} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="New on 44" href="/browse" />
          <ProductShelf products={newest} ownedProductIds={ownedProductIds} />
        </section>

        <div className="store-feature-shell">
          {creatorFeatures.map(product => (
            <CreatorFeature key={`${product.creator}-${product.id}`} product={product} />
          ))}
        </div>

        {freeProducts.length > 0 && (
          <section>
            <SectionHeader title="Free to Keep" href={browseHref({ filter: 'free' })} />
            <ProductGrid products={freeProducts} ownedProductIds={ownedProductIds} />
          </section>
        )}
    </PageShell>
  );
}

function StoreHero({ product, owned }: { product: Product; owned: boolean }) {
  return (
    <section className="store-hero-shell">
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.035)', minHeight: 420 }}>
        {product.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.82), rgba(8,8,14,0.42) 48%, rgba(8,8,14,0.10)), linear-gradient(0deg, rgba(8,8,14,0.82), rgba(8,8,14,0.06) 58%)' }} />
        <div style={{ position: 'relative', zIndex: 1, minHeight: 420, padding: 34, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: 680 }}>
            <div className="chip" style={{ marginBottom: 18 }}>Featured</div>
            <h1 style={{ fontSize: 58, maxWidth: 740, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 0.94, color: '#fff', marginBottom: 12 }}>{product.title}</h1>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.62)', marginBottom: 14 }}>by {product.creator}</div>
            <p style={{ maxWidth: 560, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: 22 }}>{product.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {!product.id.startsWith('fallback-') && <Link className="btn-primary" href={`/product/${product.id}`}>Learn More</Link>}
              </div>
              {owned && <div className="chip">Owned</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: string }) {
  return (
    <Link href={browseHref({ category })} style={{ minHeight: 120, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,18,0.04), rgba(10,10,18,0.72))' }} />
      <div style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{category}</div>
    </Link>
  );
}

function CreatorFeature({ product }: { product: Product }) {
  return (
    <section style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', overflow: 'hidden', minHeight: 330 }}>
      <div style={{ minHeight: 190, background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
        {product.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <div style={{ padding: 22 }}>
        <div className="chip" style={{ marginBottom: 14 }}>Creator Feature</div>
        <h2 style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 10 }}>{product.creator}</h2>
        <p style={{ maxWidth: 560, fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.52)', fontWeight: 500, marginBottom: 18 }}>Products, releases, experiments, and future services live together around the creator.</p>
        <Link className="btn-ghost" href={browseHref({ q: product.creator })}>Explore Creator</Link>
      </div>
    </section>
  );
}

function ProductGrid({ products, ownedProductIds }: { products: Product[]; ownedProductIds: string[] }) {
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} />
      ))}
    </div>
  );
}

function ProductShelf({ products, ownedProductIds }: { products: Product[]; ownedProductIds: string[] }) {
  return (
    <div className="product-shelf">
      {products.map(product => (
        <div key={product.id} style={{ width: 190, flex: '0 0 auto' }}>
          <ProductCard product={product} owned={ownedProductIds.includes(product.id)} />
        </div>
      ))}
    </div>
  );
}
