'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = '44-cart-v1';
const CHANGE_EVENT = '44-cart-changed';

export type CartItem = {
  item_id: string;
  title: string;
  creator: string;
  item_type?: string | null;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  slug?: string | null;
  href?: string | null;
};

const EMPTY_CART: readonly CartItem[] = Object.freeze([]);
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = [];

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return EMPTY_CART as CartItem[];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  if (!raw) {
    cachedItems = [];
    return cachedItems;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedItems = Array.isArray(parsed)
      ? parsed.flatMap((entry: CartItem & { product_id?: string; quantity?: number }) => {
          const itemId = entry.item_id || entry.product_id;
          if (!itemId) return [];
          const current = { ...entry };
          delete current.product_id;
          delete current.quantity;
          return [{ ...current, item_id: itemId }];
        })
      : [];
  } catch {
    cachedItems = [];
  }
  return cachedItems;
}

function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(item: CartItem) {
  const items = readCart();
  const existing = items.find(entry => entry.item_id === item.item_id);
  if (!existing) items.push(item);
  writeCart(items);
}

export function removeFromCart(itemId: string) {
  writeCart(readCart().filter(entry => entry.item_id !== itemId));
}

export function clearCart() {
  writeCart([]);
}

export function cartSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, entry) => sum + entry.price_cents, 0);
}

export function cartCount(items: CartItem[]) {
  return items.length;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function getSnapshot(): CartItem[] {
  return readCart();
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART as CartItem[];
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const has = useCallback(
    (itemId: string) => items.some(entry => entry.item_id === itemId),
    [items],
  );

  // No-op effect just to keep the hook stable; useSyncExternalStore handles updates.
  useEffect(() => {}, []);

  return {
    items,
    count: cartCount(items),
    subtotalCents: cartSubtotalCents(items),
    has,
  };
}
