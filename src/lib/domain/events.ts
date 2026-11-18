import { supabase } from '@/lib/supabase';
import { getProductExperience } from '@/lib/experience';

export type EventFormat = 'in_person' | 'online' | 'hybrid';
export type CreatorEvent = {
  id: string; creator_id: string; title: string; short_description: string; format: EventFormat;
  starts_at: string; ends_at: string | null; timezone: string; venue_name: string | null;
  address_line1: string | null; address_line2: string | null; locality: string | null; region: string | null;
  postal_code: string | null; country_code: string | null; online_url: string | null; info_url: string | null; cover_url: string | null;
  lifecycle_state: 'scheduled' | 'cancelled' | 'removed'; moderation_state: 'visible' | 'hidden' | 'removed';
  moderation_reason: string | null; created_at: string; updated_at: string;
};

export type EventPayload = Omit<CreatorEvent, 'id'|'creator_id'|'lifecycle_state'|'moderation_state'|'moderation_reason'|'created_at'|'updated_at'>;

export type CalendarEntry = {
  source_type: 'event'|'release'; source_id: string; creator_id: string; title: string; description: string | null;
  starts_at: string; ends_at: string | null; timezone: string; state: string; format: EventFormat | null;
  venue_name: string | null; locality: string | null; region: string | null; country_code: string | null;
  online_url: string | null; info_url: string | null; profile_username: string | null; profile_slug: string | null; profile_display_name?: string | null;
  item_slug: string | null; item_cover_url: string | null;
};

type CalendarCatalogRelease = {
  id: string;
  author_id: string | null;
  title: string;
  creator: string | null;
  item_type: string;
  experience_type: string | null;
  release_date: string | null;
  slug: string | null;
  cover_url: string | null;
  creators: { display_name: string | null; username: string | null } | null;
};

/** Published music and book release dates, matching the iOS calendar source. */
export async function loadCalendarReleaseEntries(startDate?: string, endDate?: string) {
  const releases: CalendarEntry[] = [];
  const pageSize = 200;

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('catalog_items')
      .select('id,author_id,title,creator,item_type,experience_type,release_date,slug,cover_url,creators:profiles!author_id(display_name,username)')
      .eq('status', 'published')
      .not('release_date', 'is', null)
      .order('release_date', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (startDate) query = query.gte('release_date', startDate);
    if (endDate) query = query.lt('release_date', endDate);

    const result = await query;
    if (result.error) throw result.error;
    const page = (result.data ?? []) as unknown as CalendarCatalogRelease[];

    for (const item of page) {
      const experience = getProductExperience(item);
      if ((experience !== 'music' && experience !== 'book') || !item.release_date) continue;
      const creator = item.creators?.display_name || item.creators?.username || item.creator || null;
      releases.push({
        source_type: 'release',
        source_id: item.id,
        creator_id: item.author_id || item.id,
        title: item.title,
        description: null,
        starts_at: new Date(`${item.release_date}T12:00:00`).toISOString(),
        ends_at: null,
        timezone: 'UTC',
        state: 'upcoming',
        format: null,
        venue_name: null,
        locality: null,
        region: null,
        country_code: null,
        online_url: null,
        info_url: null,
        profile_username: item.creators?.username ?? null,
        profile_slug: null,
        profile_display_name: creator,
        item_slug: item.slug,
        item_cover_url: item.cover_url,
      });
    }

    if (page.length < pageSize) break;
  }

  return releases;
}

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
