import assert from 'node:assert/strict';
import { nativeAppConfiguration } from '../src/lib/server/nativeApp';
import { GET as capabilities } from '../src/app/api/native/v1/capabilities/route';
import { GET as health } from '../src/app/api/native/v1/health/route';
import { POST as resolveProtectedAsset } from '../src/app/api/native/v1/protected-assets/resolve/route';

async function main() {
  const baseline = nativeAppConfiguration({});
  assert.equal(baseline.contractVersion, 1);
  assert.equal(baseline.minimumAppVersion, '1.0.0');
  assert.equal(baseline.maintenanceMode, false);
  assert.equal(baseline.features.catalog.enabled, true);
  assert.equal(baseline.features.orders.enabled, true);
  assert.equal(baseline.features.protected_assets.enabled, false);
  assert.equal(baseline.features.merch_checkout.enabled, false);
  assert.equal(baseline.features.push.enabled, false);
  assert.equal(baseline.features.universal_links.enabled, false);

  const disabled = nativeAppConfiguration({
    NATIVE_IOS_ENABLED_CAPABILITIES: '',
    NATIVE_IOS_MAINTENANCE_MODE: 'true',
    NATIVE_IOS_MINIMUM_APP_VERSION: '2.1',
  });
  assert.equal(disabled.minimumAppVersion, '2.1');
  assert.equal(disabled.maintenanceMode, true);
  assert.equal(Object.values(disabled.features).some(feature => feature.enabled), false);

  const allowlisted = nativeAppConfiguration({
    NATIVE_IOS_ENABLED_CAPABILITIES: 'catalog,push,unknown, merch_checkout',
    NATIVE_IOS_MINIMUM_APP_VERSION: 'not-a-version',
  });
  assert.equal(allowlisted.minimumAppVersion, '1.0.0');
  assert.equal(allowlisted.features.catalog.enabled, true);
  assert.equal(allowlisted.features.push.enabled, true);
  assert.equal(allowlisted.features.merch_checkout.enabled, true);
  assert.equal(allowlisted.features.library.enabled, false);
  assert.equal(Object.keys(allowlisted.features).includes('unknown'), false);

  const capabilitiesResponse = await capabilities();
  assert.equal(capabilitiesResponse.status, 200);
  assert.match(capabilitiesResponse.headers.get('cache-control') ?? '', /no-store/);
  const capabilitiesBody = await capabilitiesResponse.json();
  assert.equal(capabilitiesBody.contract_version, 1);
  assert.equal(typeof capabilitiesBody.features.catalog.enabled, 'boolean');
  assert.equal(typeof capabilitiesBody.server_time, 'string');

  const healthResponse = await health();
  assert.equal(healthResponse.status, 200);
  assert.match(healthResponse.headers.get('cache-control') ?? '', /no-store/);
  const healthBody = await healthResponse.json();
  assert.equal(healthBody.contract_version, 1);
  assert.equal(healthBody.status, 'available');
  assert.equal(typeof healthBody.release, 'string');

  const disabledProtectedAssetResponse = await resolveProtectedAsset(new Request(
    'https://app.44os.com/api/native/v1/protected-assets/resolve',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: '11000000-0000-4000-8000-000000000001',
        asset_id: '12000000-0000-4000-8000-000000000001',
        purpose: 'read',
      }),
    },
  ));
  assert.equal(disabledProtectedAssetResponse.status, 503);
  assert.match(disabledProtectedAssetResponse.headers.get('cache-control') ?? '', /no-store/);
  assert.equal((await disabledProtectedAssetResponse.json()).code, 'capability_disabled');

  console.log('Native iOS capabilities and health contracts passed.');
}

void main();
