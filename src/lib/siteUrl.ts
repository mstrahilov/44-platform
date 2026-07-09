const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ? stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL) : '';
  if (typeof window === 'undefined') return configured || 'https://44os.com';

  const { origin, hostname } = window.location;
  if (LOCAL_HOSTNAMES.has(hostname)) return origin;
  return configured || origin;
}

export function getSitePathUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
