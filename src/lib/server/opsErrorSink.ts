import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type SanitizedErrorEvent = {
  occurredAt: string;
  release: string;
  runtime: string;
  method: string;
  path: string;
  errorName: string;
  errorDigest?: string;
  safeMessage?: string;
  frameworkContext: Record<string, unknown>;
};

export async function persistSanitizedErrorEvent(event: SanitizedErrorEvent) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const client = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.rpc('record_sanitized_error_event' as never, {
    target_occurred_at: event.occurredAt,
    target_release: event.release,
    target_runtime: event.runtime,
    target_method: event.method,
    target_path: event.path,
    target_error_name: event.errorName,
    target_error_digest: event.errorDigest ?? null,
    target_safe_message: event.safeMessage ?? null,
    target_framework_context: event.frameworkContext,
  } as never);
}
