import { commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET?.trim() || 'uploads';
const BATCH_SIZE = 50;
const GRACE_MS = 7 * 24 * 60 * 60_000;

/** Bounded cron worker: removes only queued, unreferenced `merch/` objects. */
export async function POST(request: Request) {
  const secret = process.env.EMAIL_CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }
  const admin = commerceAdminClient();
  const run = await admin.from('merch_storage_reconciliation_runs' as never).insert({} as never).select('id').single();
  if (run.error || !(run.data as { id?: string } | null)?.id) return Response.json({ error: 'Merch reconciliation audit is unavailable.' }, { status: 500 });
  const runId = (run.data as { id: string }).id;
  const due = await admin.from('merch_storage_cleanup_queue' as never)
    .select('id,storage_path,attempts').is('completed_at', null).lte('not_before', new Date().toISOString())
    .order('created_at').limit(BATCH_SIZE);
  if (due.error) return Response.json({ error: 'Merch cleanup queue is unavailable.' }, { status: 500 });
  let removed = 0; let retained = 0; let failed = 0; let scanned = 0; let queued = 0;
  // List only the dedicated two-segment Merch prefix and cap every pass.
  const folders = await admin.storage.from(UPLOAD_BUCKET).list('merch', { limit: BATCH_SIZE });
  if (!folders.error) {
    for (const folder of (folders.data ?? []).slice(0, BATCH_SIZE)) {
      const files = await admin.storage.from(UPLOAD_BUCKET).list(`merch/${folder.name}`, { limit: BATCH_SIZE });
      for (const file of (files.data ?? []).slice(0, Math.max(0, BATCH_SIZE - scanned))) {
        const storagePath = `merch/${folder.name}/${file.name}`;
        if (!/^merch\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/.test(storagePath)) continue;
        scanned += 1;
        const reference = await admin.from('merch_product_images' as never).select('id').eq('storage_path', storagePath).maybeSingle();
        if (reference.error) { failed += 1; continue; }
        if (!reference.data) {
          const enqueue = await admin.from('merch_storage_cleanup_queue' as never).insert({ storage_path: storagePath, reason: 'unreferenced', not_before: new Date(Date.now() + GRACE_MS).toISOString() } as never).select('id').maybeSingle();
          if (enqueue.error && !/duplicate/i.test(enqueue.error.message)) failed += 1;
          else if (enqueue.data) queued += 1;
        }
      }
      if (scanned >= BATCH_SIZE) break;
    }
  } else { failed += 1; }
  for (const entry of (due.data ?? []) as unknown as Array<{ id: string; storage_path: string; attempts: number }>) {
    if (!/^merch\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/.test(entry.storage_path)) { retained += 1; continue; }
    const reference = await admin.from('merch_product_images' as never).select('id').eq('storage_path', entry.storage_path).maybeSingle();
    if (reference.error) { failed += 1; continue; }
    if (reference.data) {
      await admin.from('merch_storage_cleanup_queue' as never).update({ completed_at: new Date().toISOString(), last_error: 'Retained: storage path became referenced.' } as never).eq('id', entry.id);
      retained += 1; continue;
    }
    const deletion = await admin.storage.from(UPLOAD_BUCKET).remove([entry.storage_path]);
    if (deletion.error) {
      await admin.from('merch_storage_cleanup_queue' as never).update({ attempts: entry.attempts + 1, last_error: deletion.error.message, not_before: new Date(Date.now() + 24 * 60 * 60_000).toISOString() } as never).eq('id', entry.id);
      failed += 1;
    } else {
      await admin.from('merch_storage_cleanup_queue' as never).update({ completed_at: new Date().toISOString(), last_error: null } as never).eq('id', entry.id);
      removed += 1;
    }
  }
  await admin.from('merch_storage_reconciliation_runs' as never).update({ completed_at: new Date().toISOString(), scanned_count: scanned, queued_count: queued, removed_count: removed, retained_count: retained, failed_count: failed, notes: `Bounded ${BATCH_SIZE}-path Merch-prefix reconciliation.` } as never).eq('id', runId);
  return Response.json({ removed, retained, failed, scanned, queued, bounded: BATCH_SIZE }, { headers: { 'Cache-Control': 'no-store' } });
}
