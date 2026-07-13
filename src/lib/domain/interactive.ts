import { supabase } from '@/lib/supabase';

export type InteractiveBuild = {
  id: string;
  item_id: string;
  runtime: 'unity_webgl' | 'webgl';
  manifest_version: number;
  build_version: string;
  unity_version: string | null;
  status: 'inactive' | 'ready' | 'retired';
  entry_url: string | null;
  compression: 'none' | 'gzip' | 'brotli';
  decompression_fallback: boolean;
  webgl_version: 1 | 2;
  wasm_required: boolean;
  requires_cross_origin_isolation: boolean;
  supports_desktop: boolean;
  supports_mobile: boolean;
  supported_browsers: Array<'chrome' | 'edge' | 'firefox' | 'safari'>;
  supported_inputs: Array<'keyboard' | 'mouse' | 'touch' | 'gamepad'>;
  preferred_orientation: 'any' | 'portrait' | 'landscape';
  minimum_device_memory_mb: number | null;
  maximum_heap_memory_mb: number | null;
  download_size_mb: number | null;
  max_session_minutes: number;
};

export type InteractiveLaunch = {
  session_id: string;
  session_token: string;
  entry_url: string;
  expires_at: string;
  manifest: Record<string, unknown>;
};

export async function getInteractiveBuild(itemId: string) {
  const result = await supabase
    .from('interactive_builds' as never)
    .select('*')
    .eq('item_id', itemId)
    .eq('status', 'ready')
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as InteractiveBuild | null;
}

export async function beginInteractiveLaunch(itemId: string, clientContext: Record<string, unknown>) {
  const result = await supabase.rpc('begin_interactive_launch' as never, {
    target_item_id: itemId,
    client_context: clientContext,
  } as never);
  if (result.error) throw result.error;
  const row = (result.data as InteractiveLaunch[] | null)?.[0];
  if (!row) throw new Error('Interactive experience is not available.');
  return row;
}

export async function recordInteractiveProgress(input: {
  sessionId: string;
  sessionToken: string;
  sequenceNumber: number;
  eventKey: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
}) {
  const result = await supabase.rpc('record_interactive_progress' as never, {
    target_session_id: input.sessionId,
    target_session_token: input.sessionToken,
    target_sequence_number: input.sequenceNumber,
    target_event_key: input.eventKey,
    event_payload: input.payload,
    target_occurred_at: input.occurredAt ?? new Date().toISOString(),
  } as never);
  if (result.error) throw result.error;
  return result.data as string;
}

export async function endInteractiveLaunch(sessionId: string, sessionToken: string) {
  const result = await supabase.rpc('end_interactive_launch' as never, {
    target_session_id: sessionId,
    target_session_token: sessionToken,
  } as never);
  if (result.error) throw result.error;
}
