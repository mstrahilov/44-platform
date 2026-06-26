'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, FALLBACK_PRODUCTS } from '@/lib/products';

const FILTERS = ['All', 'Featured', 'Free', 'Music', 'Games', 'Books', 'Sample Packs', 'Interactive', 'Tools', 'Apparel'];

export default function BrowsePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTag, setActiveTag] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    const category = params.get('category');
    const tag = params.get('tag');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (filter === 'featured') setActiveFilter('Featured');
      if (filter === 'free') setActiveFilter('Free');
      if (category) setActiveFilter(category);
      if (tag) setActiveTag(tag);
      if (q) setQuery(q);
    });
  }, []);

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
  const visibleProducts = useMemo(() => {
    return catalog.filter(product => {
      const matchesFilter =
        activeFilter === 'All'
        || (activeFilter === 'Featured' && product.featured)
        || (activeFilter === 'Free' && product.is_free)
        || product.category === activeFilter;
      const matchesTag = !activeTag || (product.tags ?? []).some(tag => tag.toLowerCase() === activeTag.toLowerCase());
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery = !normalizedQuery
        || product.title.toLowerCase().includes(normalizedQuery)
        || product.creator.toLowerCase().includes(normalizedQuery)
        || product.category.toLowerCase().includes(normalizedQuery)
        || product.product_type.toLowerCase().includes(normalizedQuery)
        || (product.tags ?? []).some(tag => tag.toLowerCase().includes(normalizedQuery));

      return matchesFilter && matchesTag && matchesQuery;
    });
  }, [activeFilter, activeTag, catalog, query]);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    catalog.forEach(product => {
      (product.tags ?? []).forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([tag]) => tag);
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
      <div className="browse-shell">
        <aside style={{ position: 'sticky', top: 0, borderRadius: 24, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleProducts.length} products{activeTag ? ` tagged ${activeTag}` : ''}</div>
          </div>

          <input
            className="input"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search catalog..."
          />

          <div className="divider" />

          <FilterGroup title="Category">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  width: '100%',
                  background: activeFilter === filter ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: `1px solid ${activeFilter === filter ? 'rgba(255,255,255,0.18)' : 'transparent'}`,
                  borderRadius: 12,
                  padding: '9px 11px',
                  fontSize: 12,
                  fontWeight: 650,
                  color: activeFilter === filter ? '#fff' : 'rgba(255,255,255,0.46)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                {filter}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup title="Tags">
            <button
              onClick={() => setActiveTag('')}
              style={{ width: '100%', background: !activeTag ? 'rgba(255,255,255,0.12)' : 'transparent', border: `1px solid ${!activeTag ? 'rgba(255,255,255,0.18)' : 'transparent'}`, borderRadius: 12, padding: '9px 11px', fontFamily: 'inherit', fontSize: 12, fontWeight: 650, color: !activeTag ? '#fff' : 'rgba(255,255,255,0.46)', cursor: 'pointer', textAlign: 'left' }}
            >
              All Tags
            </button>
            {popularTags.map(tag => (
              <Link
                key={tag}
                href={browseHref({ tag })}
                onClick={() => setActiveTag(tag)}
                style={{ display: 'block', background: activeTag === tag ? 'rgba(255,255,255,0.12)' : 'transparent', border: `1px solid ${activeTag === tag ? 'rgba(255,255,255,0.18)' : 'transparent'}`, borderRadius: 12, padding: '9px 11px', fontSize: 12, fontWeight: 650, color: activeTag === tag ? '#fff' : 'rgba(255,255,255,0.46)' }}
              >
                {tag}
              </Link>
            ))}
          </FilterGroup>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 7 }}>{activeFilter}{activeTag ? ` / ${activeTag}` : ''}</div>
              <div style={{ fontSize: 30, fontWeight: 750, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>Full Store Catalog</div>
            </div>
            <Link className="btn-ghost" href="/">Back to Store</Link>
          </div>

          <div className="product-grid">
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} onGet={addProductToLibrary} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  );
}
