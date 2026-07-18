'use client';

export const ANALYTICS_CONSENT_STORAGE_KEY = '44-analytics-consent-v1';
export const ANALYTICS_CONSENT_EVENT = '44-analytics-consent-changed';
export const ANALYTICS_READY_EVENT = '44-analytics-ready';

export type AnalyticsConsent = 'granted' | 'denied' | 'unset';

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category: string;
  item_category2?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export type BrowserAnalyticsEventMap = {
  page_view: { page_path: string; page_title: string };
  view_item: { currency?: string; value?: number; items: AnalyticsItem[] };
  select_item: { item_list_id: string; item_list_name: string; items: AnalyticsItem[] };
  add_to_cart: { currency: string; value: number; items: AnalyticsItem[] };
  remove_from_cart: { currency: string; value: number; items: AnalyticsItem[] };
  begin_checkout: { currency: string; value: number; items: AnalyticsItem[] };
  content_engagement: { content_id: string; content_type: string; action: string };
};

// Purchase and refund events are intentionally excluded from the browser emitter.
// They require a durable, server-authoritative event ledger keyed by the permanent
// order ID and signed provider state before M21 may enable them.
export type VerifiedCommerceAnalyticsEvent =
  | { name: 'purchase'; order_id: string; currency: string; value: number; tax: number; shipping: number; items: AnalyticsItem[]; verification: 'signed_webhook' }
  | { name: 'refund'; order_id: string; currency: string; value: number; items: AnalyticsItem[]; verification: 'signed_webhook' };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __44osAnalyticsReady?: boolean;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'unset';
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, 'unset'>) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value); } catch { /* A blocked store remains fail-closed. */ }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { value } }));
}

export function trackBrowserAnalyticsEvent<Name extends keyof BrowserAnalyticsEventMap>(
  name: Name,
  payload: BrowserAnalyticsEventMap[Name],
) {
  if (typeof window === 'undefined' || !window.__44osAnalyticsReady || getAnalyticsConsent() !== 'granted' || !window.gtag) return false;
  const safePayload = sanitizeEventPayload(name, payload);
  if (!safePayload) return false;
  window.gtag('event', name, safePayload);
  return true;
}

function sanitizeEventPayload<Name extends keyof BrowserAnalyticsEventMap>(name: Name, payload: BrowserAnalyticsEventMap[Name]) {
  if (name === 'page_view') {
    const pagePath = cleanPath((payload as BrowserAnalyticsEventMap['page_view']).page_path);
    if (!pagePath) return null;
    return { page_path: pagePath, page_title: cleanText((payload as BrowserAnalyticsEventMap['page_view']).page_title, 120) };
  }
  if (name === 'content_engagement') {
    const event = payload as BrowserAnalyticsEventMap['content_engagement'];
    return {
      content_id: cleanIdentifier(event.content_id),
      content_type: cleanText(event.content_type, 40),
      action: cleanText(event.action, 40),
    };
  }

  const event = payload as BrowserAnalyticsEventMap['view_item']
    | BrowserAnalyticsEventMap['select_item']
    | BrowserAnalyticsEventMap['add_to_cart']
    | BrowserAnalyticsEventMap['remove_from_cart']
    | BrowserAnalyticsEventMap['begin_checkout'];
  const items = event.items.slice(0, 50).map(sanitizeItem).filter((item): item is AnalyticsItem => Boolean(item));
  if (!items.length) return null;
  const common = { items } as Record<string, unknown>;
  if ('currency' in event && event.currency) common.currency = cleanCurrency(event.currency);
  if ('value' in event && typeof event.value === 'number') common.value = cleanMoney(event.value);
  if ('item_list_id' in event) common.item_list_id = cleanIdentifier(event.item_list_id);
  if ('item_list_name' in event) common.item_list_name = cleanText(event.item_list_name, 80);
  return common;
}

function sanitizeItem(item: AnalyticsItem): AnalyticsItem | null {
  const itemId = cleanIdentifier(item.item_id);
  const itemName = cleanText(item.item_name, 120);
  const itemCategory = cleanText(item.item_category, 60);
  if (!itemId || !itemName || !itemCategory) return null;
  return {
    item_id: itemId,
    item_name: itemName,
    item_category: itemCategory,
    ...(item.item_category2 ? { item_category2: cleanText(item.item_category2, 60) } : {}),
    ...(item.item_variant ? { item_variant: cleanText(item.item_variant, 80) } : {}),
    ...(typeof item.price === 'number' ? { price: cleanMoney(item.price) } : {}),
    ...(typeof item.quantity === 'number' ? { quantity: Math.max(1, Math.min(99, Math.floor(item.quantity))) } : {}),
  };
}

function cleanPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) return '';
  return value.split(/[?#]/, 1)[0].slice(0, 240);
}

function cleanIdentifier(value: string) {
  return value.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 120);
}

function cleanCurrency(value: string) {
  return /^[A-Z]{3}$/.test(value) ? value : 'USD';
}

function cleanMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;
}

function cleanText(value: string, max: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
