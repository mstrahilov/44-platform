import type { CommunityPost, Creator } from './platform';
import type { Product } from './products';

export type TaxonomyItem = Product | CommunityPost | Creator;

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

export function itemTypeName(item: TaxonomyItem) {
  if ('item_type' in item) return item.item_type;
  if ('creator_type' in item) return item.creator_type ?? null;
  return null;
}

export function itemSearchText(item: TaxonomyItem, extra: Array<string | null | undefined> = []) {
  const fields = [...extra, itemTypeName(item)];

  if ('title' in item) fields.push(item.title);
  if ('name' in item) fields.push(item.name);
  if ('creator' in item) fields.push(item.creator);
  if ('experience_type' in item) fields.push(item.experience_type);
  if ('short_description' in item) fields.push(item.short_description);
  if ('long_description' in item) fields.push(item.long_description);
  if ('body' in item) fields.push(item.body);
  if ('bio' in item) fields.push(item.bio);
  if ('creators' in item) {
    const creatorLabel =
      item.creators && 'display_name' in item.creators
        ? item.creators.display_name
        : item.creators?.name;
    fields.push(creatorLabel);
  }
  if ('tags' in item) fields.push(...(item.tags ?? []));

  return fields.filter(Boolean).join(' ').toLowerCase();
}

export function matchesQuery(item: TaxonomyItem, query: string, extra: Array<string | null | undefined> = []) {
  const normalized = query.trim().toLowerCase();
  return !normalized || itemSearchText(item, extra).includes(normalized);
}
