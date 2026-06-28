'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { FALLBACK_PRODUCTS } from '@/lib/products';
import type { Category } from '@/lib/platform';
import { FALLBACK_CATEGORIES } from '@/lib/platform';
import { matchesCategory, matchesQuery, resolveCategory } from '@/lib/taxonomy';
import { BrowsePanel, DockedContent, DockedLayout } from '@/components/Ui';

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
        .select('*')
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

  const catalog = products.length > 0 ? products : FALLBACK_PRODUCTS;
  const categoryList = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'products');

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

  function activateCategory(slug: string) {
    setActiveCategory(slug);
  }

  function countForCategory(category: Category) {
    return catalog.filter(product => matchesCategory(product, category)).length;
  }

  return (
    <DockedLayout side="left">
        <BrowsePanel
          title="Browse Store"
          totalCount={catalog.length}
          activeId={activeCategory}
          onSelect={activateCategory}
          onClear={() => {
            setActiveCategory('all');
            setQuery('');
          }}
          categories={categoryList.map(category => ({
              id: category.slug,
              label: category.name,
              icon: category.slug,
              count: countForCategory(category),
            }))}
        />

        <DockedContent>
          <div className="product-grid">
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} owned={ownedProductIds.includes(product.id)} />
            ))}
          </div>
        </DockedContent>
    </DockedLayout>
  );
}
