import { supabase } from '@/lib/supabase';
import type { CreatorPaidSalesState } from '@/lib/domain/adminOperations';

export type { CreatorPaidSalesState };

export async function loadCreatorPaidSalesState(creatorId: string) {
  const result = await supabase.rpc('get_creator_paid_sales_state' as never, {
    target_creator_id: creatorId,
  } as never);
  if (result.error) throw result.error;
  return result.data as unknown as CreatorPaidSalesState;
}

export function creatorPaidSalesMessage(state: CreatorPaidSalesState | null) {
  if (!state) return 'Creator setup status is loading.';
  if (state.can_sell_paid) return 'Paid sales are enabled for this creator account.';
  if (state.state === 'not_reviewed') return 'Member-to-Creator promotion must be approved by forty four.';
  if (state.state === 'onboarding_required') return 'Complete individual tax and Wise email-to-claim setup before uploading Items.';
  if (state.state === 'pending_tax') return 'Your tax form must be completed and accepted before uploading Items.';
  if (state.state === 'pending_provider') return 'Complete your Wise email-to-claim destination before uploading Items.';
  if (state.state === 'country_unavailable') return 'Creator access is waitlisted until forty four verifies a Wise email payout route for your country.';
  if (state.state === 'entity_waitlisted') return 'Entity sellers are waitlisted for a later launch phase.';
  if (state.state === 'restricted') return 'This onboarding case requires professional review.';
  return 'Creator sales are currently disabled for this account.';
}
