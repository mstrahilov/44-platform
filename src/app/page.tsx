'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, FALLBACK_PRODUCTS, formatProductPrice, productMeta } from '@/lib/products';

const FILTERS = ['All', 'Music', 'Games', 'Books', 'Sample Packs', 'Interactive', 'Tools', 'Apparel', 'Free'];

export default function StorePage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
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
  const visibleProducts = activeFilter === 'All'
    ? catalog
    : activeFilter === 'Free'
      ? catalog.filter(product => product.is_free)
      : catalog.filter(product => product.category === activeFilter);
  const featured = catalog.find(product => product.featured) ?? catalog[0];
  const featuredProducts = catalog.filter(product => product.featured).slice(0, 3);
  const trending = visibleProducts.slice(0, 6);

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
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {featured && <Hero product={featured} onGet={addProductToLibrary} owned={ownedProductIds.includes(featured.id)} />}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, flexShrink: 0 }}>
        {FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            style={{
              background: activeFilter === filter ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeFilter === filter ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: 9999,
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: activeFilter === filter ? '#fff' : 'rgba(255,255,255,0.40)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
              fontFamily: 'inherit',
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <SectionHeader title="New & Trending" href="/browse" />
      <ProductGrid products={trending} ownedProductIds={ownedProductIds} onGet={addProductToLibrary} />

      <SectionHeader title="Featured by Creators" href="/browse?filter=featured" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {(featuredProducts.length > 0 ? featuredProducts : catalog.slice(0, 3)).map(product => (
          <FeaturedCard key={product.id} product={product} />
        ))}
      </div>

      <SectionHeader title="Full Catalog" href="/browse" />
      <ProductGrid products={catalog.slice(0, 6)} ownedProductIds={ownedProductIds} onGet={addProductToLibrary} />
    </div>
  );
}

function Hero({ product, owned, onGet }: { product: Product; owned: boolean; onGet: (product: Product) => void }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, overflow: 'hidden', display: 'flex', alignItems: 'stretch', minHeight: 220, position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(147,255,0,0.12)', border: '1px solid rgba(147,255,0,0.25)', borderRadius: 9999, padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93FF00', marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, background: '#93FF00', borderRadius: '50%' }} />
            Featured
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>{productMeta(product)}</div>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', marginBottom: 6 }}>{product.title}</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>by {product.creator}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {(product.tags ?? []).slice(0, 4).map(tag => (
              <Link key={tag} href={browseHref({ tag })} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '3px 10px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{tag}</Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: product.is_free ? '#93FF00' : '#fff' }}>{formatProductPrice(product)}</div>
          <button className="btn-primary" onClick={() => onGet(product)}>{owned ? 'Owned' : product.is_free ? 'Add to Library' : 'View Product'}</button>
          {!product.id.startsWith('fallback-') && <Link className="btn-ghost" href={`/product/${product.id}`}>View Page</Link>}
        </div>
      </div>
      <div style={{ width: 260, flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 180, height: 180, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          {product.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: -14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{title}</div>
      <Link href={href} style={{ fontSize: 12, fontWeight: 700, color: '#93FF00' }}>View All →</Link>
    </div>
  );
}

function ProductGrid({ products, ownedProductIds, onGet }: { products: Product[]; ownedProductIds: string[]; onGet: (product: Product) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} onGet={onGet} />
      ))}
    </div>
  );
}

function FeaturedCard({ product }: { product: Product }) {
  return (
    <Link href={product.id.startsWith('fallback-') ? '/browse' : `/product/${product.id}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 5 }}>{productMeta(product)}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 3 }}>{product.title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{product.creator}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{product.description}</div>
      </div>
    </Link>
  );
}
