import { supabase } from '@/lib/supabase';

export const NOTIFICATION_STATE_UPDATED = '44:notification-state-updated';

const LEGACY_SEEN_KEY = '44-seen-notification-ids';
const LEGACY_HIDDEN_KEY = '44-hidden-notification-ids';

export type NotificationReadState = {
  seenIds: Set<string>;
  hiddenIds: Set<string>;
};

function userKey(base: string, userId: string) {
  return `${base}:${userId}`;
}

function readLocalIds(base: string, userId: string) {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const scoped = window.localStorage.getItem(userKey(base, userId));
    const legacy = window.localStorage.getItem(base);
    return new Set<string>([
      ...(scoped ? JSON.parse(scoped) as string[] : []),
      ...(legacy ? JSON.parse(legacy) as string[] : []),
    ]);
  } catch {
    return new Set<string>();
  }
}

function writeLocalState(userId: string, state: NotificationReadState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(userKey(LEGACY_SEEN_KEY, userId), JSON.stringify([...state.seenIds]));
    window.localStorage.setItem(userKey(LEGACY_HIDDEN_KEY, userId), JSON.stringify([...state.hiddenIds]));
    window.localStorage.removeItem(LEGACY_SEEN_KEY);
    window.localStorage.removeItem(LEGACY_HIDDEN_KEY);
  } catch {
    // Cross-device persistence remains authoritative when local storage is unavailable.
  }
}

function broadcastState(state: NotificationReadState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_STATE_UPDATED, {
    detail: {
      seenIds: [...state.seenIds],
      hiddenIds: [...state.hiddenIds],
    },
  }));
}

export async function loadNotificationReadState(userId: string): Promise<NotificationReadState> {
  const localSeen = readLocalIds(LEGACY_SEEN_KEY, userId);
  const localHidden = readLocalIds(LEGACY_HIDDEN_KEY, userId);
  const { data } = await supabase
    .from('user_notification_state')
    .select('seen_notification_ids,hidden_notification_ids')
    .eq('user_id', userId)
    .maybeSingle();

  const row = data as { seen_notification_ids?: string[] | null; hidden_notification_ids?: string[] | null } | null;
  const state = {
    seenIds: new Set([...(row?.seen_notification_ids ?? []), ...localSeen]),
    hiddenIds: new Set([...(row?.hidden_notification_ids ?? []), ...localHidden]),
  };
  writeLocalState(userId, state);
  return state;
}

export async function saveNotificationReadState(userId: string, state: NotificationReadState) {
  writeLocalState(userId, state);
  await supabase.from('user_notification_state').upsert({
    user_id: userId,
    seen_notification_ids: [...state.seenIds],
    hidden_notification_ids: [...state.hiddenIds],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  broadcastState(state);
}
