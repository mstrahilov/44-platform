'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, FALLBACK_PRODUCTS, formatProductPrice } from '@/lib/products';

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
  const creatorFeatures = [
    catalog.find(product => product.creator === 'ØLSTEN') ?? catalog[0],
    catalog.find(product => product.creator === '44 CORPORATION') ?? catalog[1] ?? catalog[0],
  ].filter(Boolean);

  const categoryCounts = useMemo(() => {
    return STORE_CATEGORIES.map(category => ({
      category,
      count: catalog.filter(product => product.category === category).length,
      product: catalog.find(product => product.category === category),
    })).filter(item => item.count > 0);
  }, [catalog]);

  async function addProductToLibrary(product: Product) {
    if (!user) {
      alert('Sign in first, then add this to your library.');
      return;
    }

    if (!product.is_free) {
      alert('Paid checkout is coming later. Free products can be added now.');
      return;
    }

    if (product.id.startsWith('fallback-')) {
      alert('Run the products SQL and import products first, then this item can be added.');
      return;
    }

    if (product.linked_release_id) {
      const { data: existingProductItem } = await supabase
        .from('library_items')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingProductItem) {
        setOwnedProductIds(current => [...new Set([...current, product.id])]);
        return;
      }

      const { data: upgradedReleaseItem, error: upgradeError } = await supabase
        .from('library_items')
        .update({ product_id: product.id })
        .eq('user_id', user.id)
        .eq('release_id', product.linked_release_id)
        .select('product_id')
        .maybeSingle();

      if (upgradeError) {
        alert(upgradeError.message);
        return;
      }

      if (upgradedReleaseItem) {
        setOwnedProductIds(current => [...new Set([...current, product.id])]);
        return;
      }
    }

    const { error } = await supabase
      .from('library_items')
      .upsert({
        user_id: user.id,
        product_id: product.id,
        release_id: product.linked_release_id,
        acquisition_type: 'free',
        listen_count: 0,
        last_listened: null,
      }, { onConflict: 'user_id,product_id' });

    if (error) {
      alert(error.message);
      return;
    }

    setOwnedProductIds(current => [...new Set([...current, product.id])]);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
        {featured && (
          <StoreHero
            product={featured}
            owned={ownedProductIds.includes(featured.id)}
            onGet={addProductToLibrary}
          />
        )}

        <section>
          <SectionHeader title="Explore 44" href="/browse" />
          <div className="store-category-grid">
            {categoryCounts.map(item => (
              <CategoryTile key={item.category} category={item.category} product={item.product} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="New on 44" href="/browse" />
          <ProductShelf products={newest} ownedProductIds={ownedProductIds} onGet={addProductToLibrary} />
        </section>

        <div className="store-feature-shell">
          {creatorFeatures.map(product => (
            <CreatorFeature key={`${product.creator}-${product.id}`} product={product} />
          ))}
        </div>

        {freeProducts.length > 0 && (
          <section>
            <SectionHeader title="Free to Keep" href={browseHref({ filter: 'free' })} />
            <ProductGrid products={freeProducts} ownedProductIds={ownedProductIds} onGet={addProductToLibrary} />
          </section>
        )}
      </div>
    </div>
  );
}

function StoreHero({ product, owned, onGet }: { product: Product; owned: boolean; onGet: (product: Product) => void }) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: product.is_free ? '#93FF00' : '#fff' }}>{formatProductPrice(product)}</div>
              <button className="btn-primary" onClick={() => onGet(product)}>{owned ? 'Owned' : product.is_free ? 'Add to Library' : 'View Product'}</button>
              {!product.id.startsWith('fallback-') && <Link className="btn-ghost" href={`/product/${product.id}`}>Open Page</Link>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ category, product }: { category: string; product?: Product }) {
  return (
    <Link href={browseHref({ category })} style={{ minHeight: 120, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
      {product?.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
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

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.58)' }}>{title}</div>
      <Link href={href} style={{ fontSize: 12, fontWeight: 800, color: '#93FF00' }}>View All {'->'}</Link>
    </div>
  );
}

function ProductGrid({ products, ownedProductIds, onGet }: { products: Product[]; ownedProductIds: string[]; onGet: (product: Product) => void }) {
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} onGet={onGet} />
      ))}
    </div>
  );
}

function ProductShelf({ products, ownedProductIds, onGet }: { products: Product[]; ownedProductIds: string[]; onGet: (product: Product) => void }) {
  return (
    <div className="product-shelf">
      {products.map(product => (
        <div key={product.id} style={{ width: 190, flex: '0 0 auto' }}>
          <ProductCard product={product} owned={ownedProductIds.includes(product.id)} onGet={onGet} />
        </div>
      ))}
    </div>
  );
}
