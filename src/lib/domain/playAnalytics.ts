import { supabase } from '@/lib/supabase';

export type ItemPlayEvent = {
  itemId: string;
  trackId: string;
  sessionId: string;
  playbackMode: 'standard' | 'radio';
  reason: 'manual' | 'queue' | 'auto' | 'next' | 'previous';
};

export async function recordItemPlay(event: ItemPlayEvent) {
  const result = await supabase.rpc('record_item_play', {
    target_item_id: event.itemId,
    target_track_id: event.trackId,
    target_session_id: event.sessionId,
    target_playback_mode: event.playbackMode,
    target_play_reason: event.reason,
  });
  if (result.error) throw result.error;
  return Boolean(result.data);
}
