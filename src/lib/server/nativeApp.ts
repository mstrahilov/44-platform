const NATIVE_CAPABILITIES = [
  'catalog',
  'library',
  'community',
  'messages',
  'notifications',
  'studio',
  'protected_assets',
  'merch_checkout',
  'orders',
  'push',
  'universal_links',
] as const;

export type NativeCapability = (typeof NATIVE_CAPABILITIES)[number];

const BASELINE_ENABLED_CAPABILITIES = new Set<NativeCapability>([
  'catalog',
  'library',
  'community',
  'messages',
  'notifications',
  'studio',
  'orders',
]);

const VERSION = /^\d+(?:\.\d+){0,2}$/;

type Environment = Record<string, string | undefined>;

function enabledCapabilities(environment: Environment) {
  if (!Object.prototype.hasOwnProperty.call(environment, 'NATIVE_IOS_ENABLED_CAPABILITIES')) {
    return BASELINE_ENABLED_CAPABILITIES;
  }

  const requested = new Set(
    (environment.NATIVE_IOS_ENABLED_CAPABILITIES ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  );
  return new Set(NATIVE_CAPABILITIES.filter(capability => requested.has(capability)));
}

function enabledBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export function nativeAppConfiguration(environment: Environment = process.env) {
  const configuredMinimum = environment.NATIVE_IOS_MINIMUM_APP_VERSION?.trim();
  const minimumAppVersion = configuredMinimum && VERSION.test(configuredMinimum)
    ? configuredMinimum
    : '1.0.0';
  const enabled = enabledCapabilities(environment);

  return {
    contractVersion: 1,
    minimumAppVersion,
    maintenanceMode: enabledBoolean(environment.NATIVE_IOS_MAINTENANCE_MODE),
    features: Object.fromEntries(
      NATIVE_CAPABILITIES.map(capability => [capability, { enabled: enabled.has(capability) }]),
    ) as Record<NativeCapability, { enabled: boolean }>,
  };
}

export function nativeNoStoreHeaders() {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'application/json',
  };
}
