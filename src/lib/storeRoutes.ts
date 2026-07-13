export type StoreCategory = 'all' | 'music' | 'books' | 'games' | 'sample-packs' | 'merch';

export const STORE_CATEGORIES: StoreCategory[] = ['all', 'music', 'books', 'games', 'merch', 'sample-packs'];

export function isStoreCategory(value: string): value is StoreCategory {
  return STORE_CATEGORIES.includes(value as StoreCategory);
}
