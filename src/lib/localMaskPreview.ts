import type { Product } from '@/lib/products';

export const LOCAL_MASK_ITEM_ID = '44a50000-0000-4000-8000-000000000001';
export const LOCAL_MASK_LIBRARY_ID = '44a50000-0000-4000-8000-000000000002';
const STORAGE_KEY = '44os.local-mask-library';

export const localMaskPreviewEnabled = process.env.NODE_ENV === 'development';

export const localMaskProduct: Product = {
  id: LOCAL_MASK_ITEM_ID,
  author_id: '1b902d98-d636-41e4-a7be-dae020240f4c',
  item_category_id: 'eb6df9b4-bb42-49ec-9ed1-2ecb6248807e',
  slug: 'mask',
  title: 'MASK',
  creator: 'ØLSTEN',
  item_type: 'Game',
  short_description: null,
  long_description: null,
  price_cents: 0,
  is_free: true,
  featured: false,
  tags: [],
  cover_url: '/api/local-mask/mask.jpg',
  hero_url: '/api/local-mask/mask.jpg',
  experience_type: 'game',
  fulfillment_type: 'digital',
  streaming_enabled: false,
  download_purchase_enabled: false,
  status: 'published',
  year: 2017,
  release_date: '2017-06-03',
  created_at: '2017-06-03T00:00:00.000Z',
  browse_type: {
    id: '44a50000-0000-4000-8000-000000000003',
    category_id: 'eb6df9b4-bb42-49ec-9ed1-2ecb6248807e',
    label: 'Game',
    slug: 'game',
    sort_order: 10,
  },
  browse_tags: [],
  creators: {
    id: '1b902d98-d636-41e4-a7be-dae020240f4c',
    slug: 'olsten44',
    username: 'olsten44',
    display_name: 'ØLSTEN',
    avatar_url: null,
    country_code: null,
    display_currency: null,
    home_country_code: null,
    home_currency: null,
  },
};

export function localMaskIsSaved() {
  return localMaskPreviewEnabled && typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'saved';
}

export function saveLocalMask() {
  if (localMaskPreviewEnabled && typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, 'saved');
}

export function hideLocalMask() {
  if (localMaskPreviewEnabled && typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}
