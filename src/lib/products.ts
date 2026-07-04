import type { Profile } from '@/lib/platform';
import { formatPrice } from '@/lib/pricing';

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
  market_mode?: string | null;
  local_price_cents?: number | null;
  local_currency?: string | null;
  available_locally_only?: boolean | null;
  is_free: boolean;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  cover_url: string | null;
  hero_url?: string | null;
  feature_description?: string | null;
  runtime_type?: string | null;
  experience_type?: string | null;
  fulfillment_type?: string | null;
  launch_url?: string | null;
  read_url?: string | null;
  download_url?: string | null;
  status?: string | null;
  year?: number | null;
  created_at: string;
  creators?: Pick<
    Profile,
    | 'id'
    | 'slug'
    | 'username'
    | 'display_name'
    | 'avatar_url'
    | 'country_code'
    | 'display_currency'
    | 'home_country_code'
    | 'home_currency'
  > | null;
}

export function formatProductPrice(product: Pick<Product, 'is_free' | 'price_cents'> & Partial<Product>) {
  return formatPrice(product);
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
