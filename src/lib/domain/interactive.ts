import { supabase } from '@/lib/supabase';
import { LOCAL_MASK_ITEM_ID, localMaskPreviewEnabled } from '@/lib/localMaskPreview';

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
  if (localMaskPreviewEnabled && itemId === LOCAL_MASK_ITEM_ID) return {
    id: '44a50000-0000-4000-8000-000000000004', item_id: itemId, runtime: 'unity_webgl', manifest_version: 1,
    build_version: '1.0', unity_version: '6000.5.3f1', status: 'ready', entry_url: '/api/local-mask/index.html',
    compression: 'gzip', decompression_fallback: false, webgl_version: 2, wasm_required: true,
    requires_cross_origin_isolation: false, supports_desktop: true, supports_mobile: false,
    supported_browsers: ['chrome', 'edge', 'firefox', 'safari'], supported_inputs: ['keyboard', 'mouse'],
    preferred_orientation: 'landscape', minimum_device_memory_mb: null, maximum_heap_memory_mb: 256,
    download_size_mb: 60.08, max_session_minutes: 240,
  } satisfies InteractiveBuild;
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
  if (localMaskPreviewEnabled && itemId === LOCAL_MASK_ITEM_ID && typeof window !== 'undefined') {
    const alternateHost = window.location.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    return {
      session_id: crypto.randomUUID(), session_token: crypto.randomUUID(),
      entry_url: `${window.location.protocol}//${alternateHost}:${window.location.port}/api/local-mask/index.html`,
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), manifest: {},
    };
  }
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
