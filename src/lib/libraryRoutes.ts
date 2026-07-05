export type LibraryCategory = 'all' | 'music' | 'books' | 'assets';

export const LIBRARY_CATEGORIES: LibraryCategory[] = ['all', 'music', 'books', 'assets'];

export function isLibraryCategory(value: string): value is LibraryCategory {
  return LIBRARY_CATEGORIES.includes(value as LibraryCategory);
}
