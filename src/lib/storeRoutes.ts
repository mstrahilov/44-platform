export type StoreCategory = 'all' | 'music' | 'books' | 'assets' | 'merch';

export const STORE_CATEGORIES: StoreCategory[] = ['all', 'music', 'books', 'assets', 'merch'];

export function isStoreCategory(value: string): value is StoreCategory {
  return STORE_CATEGORIES.includes(value as StoreCategory);
}
