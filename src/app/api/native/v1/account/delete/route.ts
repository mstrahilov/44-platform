import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { NativeRequestError, nativeRequestErrorResponse } from '@/lib/server/nativeRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const admin = commerceAdminClient();

    // Try the real thing first: a plain member has no rows protected by an
    // ON DELETE RESTRICT foreign key (payout, order, or moderation history),
    // so Postgres lets this succeed and the account is gone immediately.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (!deleteError) {
      return Response.json({ contract_version: 1, status: 'deleted' }, {
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      });
    }

    // A creator/seller/moderator has rows a RESTRICT constraint refuses to
    // let cascade (Stripe/Wise payout records, buyer order history, admin
    // audit trails) — deleting those here would corrupt other members' data.
    // Anonymize and disable login immediately instead; the row itself is
    // removed later by a manual cleanup pass once that can be done without
    // touching another member's records.
    const suffix = user.id.replace(/-/g, '').slice(0, 8);
    const { error: anonymizeError } = await admin
      .from('profiles')
      .update({
        display_name: 'Deleted User',
        username: `deleted_${suffix}`,
        avatar_url: null,
        hero_url: null,
        bio: null,
        deletion_requested_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (anonymizeError) {
      throw new NativeRequestError(500, 'deletion_failed', 'Your account could not be deleted. Try again.');
    }

    // `ban_duration` also blocks Supabase from minting new sessions or
    // honoring existing ones on the next `auth.getUser()` check, which every
    // native endpoint already performs — so this signs the member out
    // everywhere on their next request, not just on this device.
    await admin.auth.admin.updateUserById(user.id, { ban_duration: '87600h' });

    return Response.json({ contract_version: 1, status: 'deletion_scheduled' }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    return nativeRequestErrorResponse(error, 'Your account could not be deleted. Try again.');
  }
}
