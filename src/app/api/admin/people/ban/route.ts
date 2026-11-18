import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { NativeRequestError, nativeRequestErrorResponse } from '@/lib/server/nativeRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BAN_END = new Date('2099-01-01T00:00:00.000Z');

export async function POST(request: Request) {
  try {
    const actor = await authenticateCommerceRequest(request);
    const body = await request.json().catch(() => null) as { profileId?: unknown; reason?: unknown } | null;
    const targetId = typeof body?.profileId === 'string' ? body.profileId : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      throw new NativeRequestError(400, 'invalid_target', 'Select a valid user.');
    }
    if (targetId === actor.id) throw new NativeRequestError(400, 'self_ban_not_allowed', 'You cannot ban your own account.');
    if (reason.length < 3 || reason.length > 500) throw new NativeRequestError(400, 'invalid_reason', 'A short audit note is required.');

    const admin = commerceAdminClient();
    const [{ data: actorProfile }, { data: targetProfile }, { data: targetAuth }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', actor.id).maybeSingle(),
      admin.from('profiles').select('role').eq('id', targetId).maybeSingle(),
      admin.auth.admin.getUserById(targetId),
    ]);
    if (actorProfile?.role !== 'admin') throw new NativeRequestError(403, 'administrator_required', 'Administrator access required.');
    if (!targetAuth.user) throw new NativeRequestError(404, 'user_not_found', 'User not found.');
    if (targetProfile?.role === 'admin') {
      const { data: adminProfiles, error: adminProfilesError } = await admin.from('profiles').select('id').eq('role', 'admin');
      if (adminProfilesError) throw new NativeRequestError(500, 'admin_check_failed', 'The administrator safety check failed.');
      const adminIds = new Set((adminProfiles ?? []).map(profile => profile.id));
      let page = 1;
      let activeOtherAdminFound = false;
      while (!activeOtherAdminFound) {
        const { data: userPage, error: usersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) throw new NativeRequestError(500, 'admin_check_failed', 'The administrator safety check failed.');
        activeOtherAdminFound = userPage.users.some(user => user.id !== targetId
          && adminIds.has(user.id)
          && (!user.banned_until || new Date(user.banned_until).getTime() <= Date.now()));
        if (activeOtherAdminFound || userPage.users.length < 1000) break;
        page += 1;
      }
      if (!activeOtherAdminFound) throw new NativeRequestError(409, 'last_admin', 'The last active administrator cannot be banned.');
    }

    const audit = admin as unknown as { from: (table: string) => {
      select: (columns: string, options?: { head?: boolean }) => { limit: (count: number) => Promise<{ error: { message: string } | null }> };
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    } };
    const { error: auditSetupError } = await audit.from('admin_account_ban_events').select('id', { head: true }).limit(1);
    if (auditSetupError) throw new NativeRequestError(503, 'ban_audit_unavailable', 'The account-ban audit migration must be applied before this action is available.');

    const durationHours = Math.ceil((BAN_END.getTime() - Date.now()) / (60 * 60 * 1000));
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: `${durationHours}h` });
    if (banError) throw new NativeRequestError(500, 'ban_failed', 'User could not be banned.');

    const { error: auditError } = await audit.from('admin_account_ban_events').insert({
      profile_id: targetId,
      changed_by: actor.id,
      banned_until: BAN_END.toISOString(),
      reason,
    });
    if (auditError) {
      const previousBanEnd = targetAuth.user.banned_until ? new Date(targetAuth.user.banned_until) : null;
      const previousHours = previousBanEnd && previousBanEnd.getTime() > Date.now()
        ? `${Math.ceil((previousBanEnd.getTime() - Date.now()) / (60 * 60 * 1000))}h`
        : 'none';
      const { error: rollbackError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: previousHours });
      if (rollbackError) throw new NativeRequestError(500, 'ban_audit_failed', 'The audit record could not be saved and the ban could not be rolled back. Contact support before taking further action.');
      throw new NativeRequestError(500, 'ban_audit_failed', 'The ban was rolled back because its audit record could not be saved.');
    }

    return Response.json({ status: 'banned', banned_until: BAN_END.toISOString() }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    return nativeRequestErrorResponse(error, 'User could not be banned.');
  }
}
