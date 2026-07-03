'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import type { Category } from '@/lib/platform';
import { matchesCategory, matchesQuery, resolveCategory } from '@/lib/taxonomy';
import { PageShell, ProductGrid, ProductCard, EmptyPanel } from '@/components/Ui';

export default function BrowsePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const filter = params.get('filter');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category) setActiveCategory(category);
      if (filter === 'free') setActiveCategory('free');
      if (filter === 'featured') setActiveCategory('featured');
      if (q) setQuery(q);
    });
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      setProducts(data ?? []);
    }

    async function fetchTaxonomy() {
      const { data: categoryRows } = await supabase
        .from('categories')
        .select('*')
        .eq('scope', 'products')
        .order('sort_order');

      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchProducts();
    fetchTaxonomy();
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
  const categoryList = categories;

  const visibleProducts = useMemo(() => {
    return catalog.filter(product => {
      const category = resolveCategory(categoryList, activeCategory);
      const categoryMatches =
        activeCategory === 'all'
        || (activeCategory === 'featured' && product.featured)
        || (activeCategory === 'free' && product.is_free)
        || matchesCategory(product, category);

      return categoryMatches && matchesQuery(product, query);
    });
  }, [activeCategory, catalog, categoryList, query]);

  const filters = [{ slug: 'all', name: 'All' }, ...categoryList.map(c => ({ slug: c.slug, name: c.name }))];

  return (
    <PageShell>
      <h1 className="browse-page-title os-type-display">Browse</h1>

      <div className="app-tag-row" style={{ marginBottom: 'var(--os-space-5)' }}>
        {filters.map(filter => (
          <button
            key={filter.slug}
            type="button"
            className={filter.slug === activeCategory ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
            onClick={() => setActiveCategory(filter.slug)}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <EmptyPanel title="Nothing here yet." body="Try a different category or clear your filters." />
      ) : (
        <ProductGrid>
          {visibleProducts.map(product => (
            <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} />
          ))}
        </ProductGrid>
      )}
    </PageShell>
  );
}
