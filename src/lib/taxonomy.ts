import type { Category, CommunityPost, Creator, Resource, Service, Tag } from './platform';
import type { Product } from './products';

export type TaxonomyItem = Product | Service | Resource | CommunityPost | Creator;

export function normalizeTaxonomyValue(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveCategory(categories: Category[], value: string) {
  const normalized = normalizeTaxonomyValue(value);
  return categories.find(category => {
    return category.id === value
      || normalizeTaxonomyValue(category.slug) === normalized
      || normalizeTaxonomyValue(category.name) === normalized;
  });
}

export function typesForCategory(types: Tag[], categoryId: string) {
  return types.filter(type => type.category_id === categoryId);
}

export function mergeTaxonomyCategories(primary: Category[], fallback: Category[]) {
  const byKey = new Map<string, Category>();

  [...fallback, ...primary].forEach(category => {
    byKey.set(`${category.scope}:${category.slug}`, category);
  });

  return Array.from(byKey.values()).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function mergeTaxonomyTypes(primary: Tag[], fallback: Tag[]) {
  const byKey = new Map<string, Tag>();

  [...fallback, ...primary].forEach(type => {
    byKey.set(`${type.category_id}:${type.slug}`, type);
  });

  return Array.from(byKey.values()).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function itemCategoryId(item: TaxonomyItem) {
  return 'category_id' in item ? item.category_id ?? null : null;
}

export function itemCategoryName(item: TaxonomyItem) {
  if ('category' in item) return item.category;
  return item.categories?.name ?? null;
}

export function itemTypeName(item: TaxonomyItem) {
  if ('product_type' in item) return item.product_type;
  if ('service_type' in item) return item.service_type ?? null;
  if ('resource_type' in item) return item.resource_type;
  if ('post_type' in item) return item.post_type;
  if ('creator_type' in item) return item.creator_type ?? null;
  return null;
}

export function matchesCategory(item: TaxonomyItem, category: Category | undefined) {
  if (!category) return true;

  const categoryId = itemCategoryId(item);
  const categoryName = itemCategoryName(item);

  return categoryId === category.id
    || normalizeTaxonomyValue(categoryName) === normalizeTaxonomyValue(category.name)
    || normalizeTaxonomyValue(categoryName) === normalizeTaxonomyValue(category.slug);
}

export function matchesType(item: TaxonomyItem, type: Tag | undefined) {
  if (!type) return true;

  const itemType = itemTypeName(item);
  const productTags = 'tags' in item ? item.tags ?? [] : [];

  return normalizeTaxonomyValue(itemType) === normalizeTaxonomyValue(type.name)
    || normalizeTaxonomyValue(itemType) === normalizeTaxonomyValue(type.slug)
    || productTags.some(tag => normalizeTaxonomyValue(tag) === normalizeTaxonomyValue(type.name) || normalizeTaxonomyValue(tag) === normalizeTaxonomyValue(type.slug));
}

export function itemSearchText(item: TaxonomyItem, extra: Array<string | null | undefined> = []) {
  const fields = [...extra, itemCategoryName(item), itemTypeName(item)];

  if ('title' in item) fields.push(item.title);
  if ('name' in item) fields.push(item.name);
  if ('creator' in item) fields.push(item.creator);
  if ('short_description' in item) fields.push(item.short_description);
  if ('long_description' in item) fields.push(item.long_description);
  if ('body' in item) fields.push(item.body);
  if ('bio' in item) fields.push(item.bio);
  if ('creators' in item) fields.push(item.creators?.name);
  if ('tags' in item) fields.push(...(item.tags ?? []));

  return fields.filter(Boolean).join(' ').toLowerCase();
}

export function matchesQuery(item: TaxonomyItem, query: string, extra: Array<string | null | undefined> = []) {
  const normalized = query.trim().toLowerCase();
  return !normalized || itemSearchText(item, extra).includes(normalized);
}
