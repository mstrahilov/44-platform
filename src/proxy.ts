import { NextRequest, NextResponse } from 'next/server';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://app.44os.com';
const MARKETING_ORIGIN = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://44os.com';
const APP_HOSTNAME = new URL(APP_ORIGIN).hostname;
const MARKETING_HOSTNAME = new URL(MARKETING_ORIGIN).hostname;
const MARKETING_ENABLED = process.env.MARKETING_SITE_ENABLED === 'true';
const INTERNAL_MARKETING_PATH = '/marketing-surface';
const LOCAL_PREVIEW_PATH = '/landing-preview';
const RELEASES_PATH = '/releases';
const INTERNAL_RELEASES_PATH = `${INTERNAL_MARKETING_PATH}${RELEASES_PATH}`;

function isPublicAsset(pathname: string) {
  return pathname.startsWith('/_next/')
    || pathname.startsWith('/marketing/')
    || pathname === '/favicon.ico'
    || pathname === '/favicon.png'
    || pathname === '/apple-touch-icon.png'
    || pathname === '/icon-192.png'
    || pathname === '/icon-512.png'
    || pathname === '/maskable-icon-512.png'
    || pathname === '/og.png'
    || pathname === '/sw.js'
    || pathname === '/manifest.webmanifest'
    || pathname === '/robots.txt'
    || pathname === '/sitemap.xml';
}

function marketingRewrite(request: NextRequest, internalPath = INTERNAL_MARKETING_PATH) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-44os-surface', 'marketing');
  const destination = request.nextUrl.clone();
  destination.pathname = internalPath;
  return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
}

function applicationRequest(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-44os-surface');
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToApp(request: NextRequest) {
  const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, APP_ORIGIN);
  return NextResponse.redirect(destination, 308);
}

function requestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',', 1)[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  return host?.replace(/:\d+$/, '').toLowerCase() || request.nextUrl.hostname.toLowerCase();
}

export function proxy(request: NextRequest) {
  const hostname = requestHostname(request);
  const pathname = request.nextUrl.pathname;
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (local && pathname === LOCAL_PREVIEW_PATH && process.env.NODE_ENV !== 'production') {
    return marketingRewrite(request);
  }

  if (local && pathname === RELEASES_PATH && process.env.NODE_ENV !== 'production') {
    return marketingRewrite(request, INTERNAL_RELEASES_PATH);
  }

  if (pathname === INTERNAL_MARKETING_PATH || pathname.startsWith(`${INTERNAL_MARKETING_PATH}/`)) {
    return new NextResponse(null, { status: 404 });
  }

  if (hostname === APP_HOSTNAME) return applicationRequest(request);

  const isApex = hostname === MARKETING_HOSTNAME;
  const isWww = hostname === `www.${MARKETING_HOSTNAME}`;
  if (!MARKETING_ENABLED || (!isApex && !isWww)) return applicationRequest(request);

  if (request.method !== 'GET' && request.method !== 'HEAD') return applicationRequest(request);
  if (pathname.startsWith('/api/')) return applicationRequest(request);
  if (pathname === '/manifest.webmanifest') return new NextResponse(null, { status: 404 });
  if (isPublicAsset(pathname)) return applicationRequest(request);

  if (pathname === '/') {
    if (isWww) {
      const destination = new URL('/', MARKETING_ORIGIN);
      destination.search = request.nextUrl.search;
      return NextResponse.redirect(destination, 308);
    }
    return marketingRewrite(request);
  }

  if (pathname === RELEASES_PATH) {
    if (isWww) {
      const destination = new URL(RELEASES_PATH, MARKETING_ORIGIN);
      destination.search = request.nextUrl.search;
      return NextResponse.redirect(destination, 308);
    }
    return marketingRewrite(request, INTERNAL_RELEASES_PATH);
  }

  if (pathname === '/download' || pathname.startsWith('/download/')) {
    return new NextResponse(null, { status: 404 });
  }

  return redirectToApp(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
