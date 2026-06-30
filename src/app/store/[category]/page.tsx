'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/products';
import { PageShell, ProductGrid, ProductCard, EmptyPanel } from '@/components/Ui';

const CATEGORY_LABEL: Record<string, string> = {
  music: 'Music',
  books: 'Books',
  games: 'Games',
  apparel: 'Apparel',
  merch: 'Merch',
  assets: 'Assets',
};

export default function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const label = CATEGORY_LABEL[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) {
        console.error('store/[category] fetch error:', JSON.stringify(error));
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Product[];
      const filtered = all.filter(p => (p.category ?? '').toLowerCase() === category.toLowerCase());
      setProducts(filtered);
      setLoading(false);
    }
    load();
  }, [category]);

  return (
    <PageShell>
      <h1 className="browse-page-title os-type-display">{label}</h1>
      {loading ? (
        <EmptyPanel title="Loading…" />
      ) : products.length === 0 ? (
        <EmptyPanel title={`No ${label.toLowerCase()} yet.`} body="Check back soon for new releases in this category." />
      ) : (
        <ProductGrid>
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ProductGrid>
      )}
    </PageShell>
  );
}
