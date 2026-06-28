'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { FALLBACK_PRODUCTS } from '@/lib/products';
import type { Category, Tag } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_TAGS } from '@/lib/platform';
import { matchesCategory, matchesQuery, matchesType, resolveCategory, typesForCategory } from '@/lib/taxonomy';
import { DockedContent, DockedLayout, DockedPanel } from '@/components/Ui';

export default function BrowsePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const type = params.get('type') ?? params.get('tag');
    const filter = params.get('filter');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category) setActiveCategory(category);
      if (type) setActiveType(type);
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
      const [{ data: categoryRows }, { data: tagRows }] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'products').order('sort_order'),
        supabase.from('tags').select('*').order('sort_order'),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setTags((tagRows as Tag[] | null) ?? []);
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
  const tagList = tags.length > 0
    ? tags
    : FALLBACK_TAGS.filter(tag => categoryList.some(category => category.id === tag.category_id));

  const visibleProducts = useMemo(() => {
    return catalog.filter(product => {
      const category = resolveCategory(categoryList, activeCategory);
      const type = resolveCategory(tagList.map(tag => ({ ...tag, scope: 'products' as const })), activeType) as Tag | undefined;
      const categoryMatches =
        activeCategory === 'all'
        || (activeCategory === 'featured' && product.featured)
        || (activeCategory === 'free' && product.is_free)
        || matchesCategory(product, category);

      return categoryMatches && matchesType(product, type) && matchesQuery(product, query);
    });
  }, [activeCategory, activeType, catalog, categoryList, query, tagList]);

  function activateCategory(slug: string) {
    setActiveCategory(slug);
    setActiveType('');
  }

  return (
    <DockedLayout side="left">
        <DockedPanel>
          <div>
            <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse Store</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleProducts.length} products</div>
          </div>

          <input
            className="input"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search catalog..."
          />

          <div className="divider" />

          <FilterButton active={activeCategory === 'all'} onClick={() => activateCategory('all')}>All Products</FilterButton>
          <FilterButton active={activeCategory === 'featured'} onClick={() => activateCategory('featured')}>Featured</FilterButton>
          <FilterButton active={activeCategory === 'free'} onClick={() => activateCategory('free')}>Free</FilterButton>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>Categories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryList.map(category => {
                const categoryTypes = typesForCategory(tagList, category.id);
                const active = activeCategory === category.slug || activeCategory === category.name;
                return (
                  <div key={category.id}>
                    <FilterButton active={active} onClick={() => activateCategory(category.slug)}>{category.name}</FilterButton>
                    {active && categoryTypes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0 8px 12px' }}>
                        <FilterButton active={!activeType} onClick={() => setActiveType('')}>All Types</FilterButton>
                        {categoryTypes.map(type => (
                          <FilterButton key={type.id} active={activeType === type.name || activeType === type.slug} onClick={() => setActiveType(type.name)}>{type.name}</FilterButton>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DockedPanel>

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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'transparent'}`,
        borderRadius: 12,
        padding: '9px 11px',
        fontSize: 12,
        fontWeight: 650,
        color: active ? '#fff' : 'rgba(255,255,255,0.46)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      {children}
    </button>
  );
}
