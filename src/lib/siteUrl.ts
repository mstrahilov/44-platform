const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_APP_URL = 'https://app.44os.com';
const DEFAULT_MARKETING_URL = 'https://44os.com';

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL ? stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL) : '';
  if (typeof window === 'undefined') return configured || DEFAULT_APP_URL;

  const { origin, hostname } = window.location;
  if (LOCAL_HOSTNAMES.has(hostname)) return origin;
  if (hostname === 'app.44os.com') return origin;
  return configured || DEFAULT_APP_URL;
}

export function getAppPathUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAppUrl()}${normalizedPath}`;
}

export function getMarketingUrl() {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_MARKETING_URL || DEFAULT_MARKETING_URL);
}
