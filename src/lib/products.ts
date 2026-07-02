import type { Profile } from '@/lib/platform';

export interface Product {
  id: string;
  author_id?: string | null;
  category_id?: string | null;
  slug?: string | null;
  title: string;
  creator: string;
  product_type: string;
  category: string;
  short_description: string | null;
  long_description: string | null;
  price_cents: number;
  is_free: boolean;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  cover_url: string | null;
  hero_url?: string | null;
  feature_description?: string | null;
  runtime_type?: string | null;
  launch_url?: string | null;
  read_url?: string | null;
  download_url?: string | null;
  status?: string | null;
  year?: number | null;
  created_at: string;
  creators?: Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url'> | null;
}

export function formatProductPrice(product: Pick<Product, 'is_free' | 'price_cents'>) {
  if (product.is_free || product.price_cents === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price_cents / 100);
}

export function productMeta(product: Pick<Product, 'product_type' | 'category'>) {
  return `${product.product_type} · ${product.category}`;
}

export function browseHref(params: { category?: string; tag?: string; filter?: string; q?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `/browse?${query}` : '/browse';
}
