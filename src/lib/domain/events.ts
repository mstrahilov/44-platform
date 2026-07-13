import { supabase } from '@/lib/supabase';

export type EventFormat = 'in_person' | 'online' | 'hybrid';
export type CreatorEvent = {
  id: string; creator_id: string; title: string; short_description: string; format: EventFormat;
  starts_at: string; ends_at: string | null; timezone: string; venue_name: string | null;
  address_line1: string | null; address_line2: string | null; locality: string | null; region: string | null;
  postal_code: string | null; country_code: string | null; online_url: string | null; info_url: string | null;
  lifecycle_state: 'scheduled' | 'cancelled' | 'removed'; moderation_state: 'visible' | 'hidden' | 'removed';
  moderation_reason: string | null; created_at: string; updated_at: string;
};

export type EventPayload = Omit<CreatorEvent, 'id'|'creator_id'|'lifecycle_state'|'moderation_state'|'moderation_reason'|'created_at'|'updated_at'>;

export type CalendarEntry = {
  source_type: 'event'|'release'; source_id: string; creator_id: string; title: string; description: string | null;
  starts_at: string; ends_at: string | null; timezone: string; state: string; format: EventFormat | null;
  venue_name: string | null; locality: string | null; region: string | null; country_code: string | null;
  online_url: string | null; info_url: string | null; profile_username: string | null; profile_slug: string | null;
  item_slug: string | null; item_cover_url: string | null;
};

export async function listCreatorEvents(creatorId: string) {
  const result = await supabase.from('creator_events').select('*').eq('creator_id', creatorId).order('starts_at', { ascending: true });
  if (result.error) throw result.error;
  return (result.data ?? []) as CreatorEvent[];
}

export async function getCreatorEvent(id: string) {
  const result = await supabase.from('creator_events').select('*').eq('id', id).maybeSingle();
  if (result.error) throw result.error;
  return result.data as CreatorEvent | null;
}

export async function saveCreatorEvent(id: string | null, payload: EventPayload) {
  const result = await supabase.rpc('save_creator_event', { target_event_id: id, payload } as never);
  if (result.error) throw result.error;
  return result.data as string;
}

export async function setCreatorEventState(id: string, state: 'scheduled'|'cancelled'|'removed') {
  const result = await supabase.rpc('set_creator_event_state', { target_event_id: id, target_state: state });
  if (result.error) throw result.error;
}

export async function loadCalendarFeed(start: string, end: string) {
  const result = await supabase.rpc('calendar_feed', { range_start: start, range_end: end });
  if (result.error) throw result.error;
  return (result.data ?? []) as CalendarEntry[];
}

export async function setItemUpcomingRelease(itemId: string, releaseAt: string | null, timezone: string | null) {
  const result = await supabase.rpc('set_item_upcoming_release', { target_item_id: itemId, release_at: releaseAt, release_timezone: timezone } as never);
  if (result.error) throw result.error;
}
