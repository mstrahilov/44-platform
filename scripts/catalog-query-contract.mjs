import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [ui, search, itemSections, catalog] = await Promise.all([
  read('src/components/Ui.tsx'),
  read('src/app/search/page.tsx'),
  read('src/components/ItemDetailSections.tsx'),
  read('src/lib/domain/catalog.ts'),
]);

const productCard = ui.match(/export function ProductCard[\s\S]*?\n}\n\nfunction resolveProductActionEntries/)?.[0] ?? '';
assert.match(productCard, /owned: boolean/, 'ProductCard requires explicit ownership from its parent');
assert.doesNotMatch(productCard, /getItemLibraryOwnership/, 'repeated ProductCards never query ownership independently');
assert.match(search, /listVisibleLibraryItemIds\(user\.id\)[\s\S]*owned=\{ownedProductIds\.has\(product\.id\)\}/, 'Search batches ownership before rendering item cards');
assert.match(itemSections, /listVisibleLibraryItemIds\(user\.id\)[\s\S]*owned=\{ownedIds\.has\(product\.id\)\}/, 'related cards share one visible-library load');
for (const table of ['item_capabilities', 'item_type_assignments', 'item_tag_assignments']) {
  assert.match(catalog, new RegExp(`from\\('${table}'\\)[\\s\\S]*?\\.in\\('item_id', itemIds\\)`), `${table} is scoped to the bounded discovery item IDs`);
}
assert.match(catalog, /from\('item_type_assignments'\)\.select\('item_id,item_types\([^']+\)'\)\.in\('item_id', itemIds\)\.eq\('item_types\.is_active', true\)/, 'discovery embeds active item types in the scoped assignment request');
assert.match(catalog, /from\('item_tag_assignments'\)\.select\('item_id,item_tags\([^']+\)'\)\.in\('item_id', itemIds\)\.eq\('item_tags\.is_active', true\)/, 'discovery embeds active item tags in the scoped assignment request');

console.log('Catalog query contract passed.');
