import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { currencyForCountry } from '../src/lib/marketPreferences';
import { resolvePrice } from '../src/lib/pricing';

const projectRoot = process.cwd();
const read = (path: string) => readFile(resolve(projectRoot, path), 'utf8');

async function main() {
assert.equal(currencyForCountry('NA'), 'NAD', 'Namibia must resolve to NAD.');
assert.equal(currencyForCountry('US'), 'USD', 'United States must resolve to USD.');

const converted = resolvePrice({ price_cents: 100, is_free: false }, {
  viewerCountry: 'NA',
  viewerCurrency: 'NAD',
  rates: { USD: 1, NAD: 18.4 },
});
assert.equal(converted.cents, 1840, 'USD display price must be numerically converted to NAD.');
assert.equal(converted.currency, 'NAD');
assert.equal(converted.checkoutCents, 100, 'Display conversion must not change the canonical checkout amount.');
assert.equal(converted.checkoutCurrency, 'USD');

const local = resolvePrice({
  price_cents: 500,
  is_free: false,
  market_mode: 'global_plus_local',
  local_price_cents: 12500,
  local_currency: 'NAD',
  creators: { country_code: 'NA' },
}, {
  viewerCountry: 'NA',
  viewerCurrency: 'NAD',
  rates: { USD: 1, NAD: 18.4 },
});
assert.equal(local.cents, 12500, 'Eligible local pricing must use the creator-entered local amount.');
assert.equal(local.checkoutCents, 12500);
assert.equal(local.source, 'local');

const missingRate = resolvePrice({ price_cents: 500, is_free: false }, {
  viewerCountry: 'CU',
  viewerCurrency: 'CUP',
  rates: { USD: 1 },
});
assert.equal(missingRate.currency, 'USD', 'Missing FX data must show USD rather than relabeling an unconverted amount.');
assert.equal(missingRate.cents, 500);

const [settings, newItem, editItem, pricingFields, theme, marketPreferences, canonicalCss] = await Promise.all([
  read('src/app/settings/page.tsx'),
  read('src/app/studio/products/new/page.tsx'),
  read('src/app/studio/products/[id]/page.tsx'),
  read('src/components/StudioPricingFields.tsx'),
  read('src/lib/theme.ts'),
  read('src/lib/marketPreferences.ts'),
  read('src/styles/44-ui/canonical-system.css'),
]);

assert.doesNotMatch(settings, /LandingAppSettings|Landing App|CURRENCIES/);
assert.match(settings, /<Ui44SelectInput value=\{mode\}/, 'Theme must use the canonical dropdown.');
assert.doesNotMatch(settings, /Magma|Polar/);
assert.doesNotMatch(marketPreferences, /supportedValuesOf\('currency'\)|buildCurrencies|export const CURRENCIES/);
assert.doesNotMatch(theme, /label: 'Magma'|label: 'Polar'/);

for (const [label, source] of [['new', newItem], ['edit', editItem]] as const) {
  assert.match(source, /<StudioDigitalPricingFields/, `${label} Studio form must use shared pricing fields.`);
  assert.doesNotMatch(source, /ui44-segmented/, `${label} Studio form must not use segmented selectors.`);
}
assert.match(pricingFields, /Global Price \(USD\)/);
assert.match(pricingFields, /Local Price \(\{localCurrency\}\)/);
assert.match(pricingFields, /Set this amount independently/);
assert.match(canonicalCss, /\.product-details-section[\s\S]{0,180}\.ui44-list-row\.ui44-list-row-detail[\s\S]{0,120}grid-template-columns: minmax\(0, 1fr\)/,
  'Mobile product details must stack values below their labels.');

console.log('Settings, Studio controls, and currency contracts passed.');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
