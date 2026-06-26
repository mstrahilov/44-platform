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
      .slice(0, 12)
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 48px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>Browse</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleProducts.length} products{activeTag ? ` tagged ${activeTag}` : ''}</div>
        </div>
        <div style={{ width: 260 }}>
          <input
            className="input"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search catalog..."
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
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
              fontFamily: 'inherit',
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTag('')}
          style={{ background: !activeTag ? 'rgba(147,255,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!activeTag ? 'rgba(147,255,0,0.22)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 9999, padding: '6px 12px', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, color: !activeTag ? '#93FF00' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
        >
          All Tags
        </button>
        {popularTags.map(tag => (
          <Link
            key={tag}
            href={browseHref({ tag })}
            onClick={() => setActiveTag(tag)}
            style={{ background: activeTag === tag ? 'rgba(147,255,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeTag === tag ? 'rgba(147,255,0,0.22)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 9999, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: activeTag === tag ? '#93FF00' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}
          >
            {tag}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
        {visibleProducts.map(product => (
          <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} onGet={addProductToLibrary} />
        ))}
      </div>
    </div>
  );
}
