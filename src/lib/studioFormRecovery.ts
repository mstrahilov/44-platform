const RECOVERY_PREFIX = '44os:studio-form:v1:';

function storageKey(key: string) {
  return `${RECOVERY_PREFIX}${key}`;
}

export function readStudioFormRecovery<T>(key: string): T | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(storageKey(key));
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function writeStudioFormRecovery(key: string, value: unknown) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Studio remains usable when private browsing or storage limits block recovery.
  }
}

export function clearStudioFormRecovery(key: string) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
