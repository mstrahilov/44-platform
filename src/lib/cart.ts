'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = '44-cart-v1';
const CHANGE_EVENT = '44-cart-changed';

export type CartItem = {
  product_id: string;
  title: string;
  creator: string;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  quantity: number;
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
    cachedItems = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
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

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const items = readCart();
  const existing = items.find(entry => entry.product_id === item.product_id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ ...item, quantity });
  }
  writeCart(items);
}

export function updateCartQuantity(productId: string, quantity: number) {
  const items = readCart();
  const next = items
    .map(entry => (entry.product_id === productId ? { ...entry, quantity } : entry))
    .filter(entry => entry.quantity > 0);
  writeCart(next);
}

export function removeFromCart(productId: string) {
  writeCart(readCart().filter(entry => entry.product_id !== productId));
}

export function clearCart() {
  writeCart([]);
}

export function cartSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, entry) => sum + entry.price_cents * entry.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, entry) => sum + entry.quantity, 0);
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
    (productId: string) => items.some(entry => entry.product_id === productId),
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
