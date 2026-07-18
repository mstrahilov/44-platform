'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { Ui44CheckboxInput, Ui44FileInput, Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

type SellerState = {
  state: string;
  country_code: string | null;
  country_eligible: boolean;
  payout_route_id: string | null;
  payout_route_currency: string | null;
  can_create_items: boolean;
  seller_type: string;
  us_person_status: string;
  expected_tax_form: 'w9' | 'w8ben' | null;
  tax_policy_approved: boolean;
  destination_status: string | null;
  destination_masked: string | null;
};

async function sellerRequest(path: string, token: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const payload = await response.json() as SellerState & { error?: string; code?: string };
  if (!response.ok) throw new Error(payload.error || 'Creator setup could not be saved.');
  return payload;
}

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<SellerState | null>(null);
  const [sellerType, setSellerType] = useState('individual');
  const [usPersonStatus, setUsPersonStatus] = useState('');
  const [specialCase, setSpecialCase] = useState('none');
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [signedAt, setSignedAt] = useState('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  async function accessToken() {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Sign in again to continue.');
    return token;
  }

  const loadState = useCallback(async () => {
    if (!user) return;
    try {
      const result = await sellerRequest('/api/creator/seller/status', await accessToken());
      setState(result);
      if (result.seller_type !== 'unanswered') setSellerType(result.seller_type);
      if (result.us_person_status !== 'unanswered') setUsPersonStatus(result.us_person_status);
      setPayoutEmail(current => current || user.email || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Creator setup could not be loaded.');
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(loadState);
  }, [loadState]);

  async function saveClassification(event: FormEvent) {
    event.preventDefault();
    setBusy('classification'); setMessage('');
    try {
      const next = await sellerRequest('/api/creator/seller/classification', await accessToken(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerType, usPersonStatus, specialCase }),
      });
      setState(next);
      setMessage(sellerType === 'individual' && specialCase === 'none'
        ? 'Self-certification saved. Complete the required IRS form next.'
        : 'This seller type or tax case has been sent to the waitlist or professional review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Self-certification could not be saved.');
    } finally { setBusy(''); }
  }

  async function uploadTaxForm(event: FormEvent) {
    event.preventDefault();
    if (!state?.expected_tax_form || !taxFile) return;
    setBusy('tax'); setMessage('');
    try {
      const form = new FormData();
      form.set('formType', state.expected_tax_form);
      form.set('signedAt', new Date(`${signedAt}T12:00:00`).toISOString());
      form.set('signatureConfirmed', String(signatureConfirmed));
      form.set('file', taxFile);
      await sellerRequest('/api/creator/seller/tax', await accessToken(), { method: 'POST', body: form });
      setMessage('Your encrypted tax form is pending restricted reviewer acceptance.');
      await loadState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tax form could not be submitted.');
    } finally { setBusy(''); }
  }

  async function savePayoutEmail(event: FormEvent) {
    event.preventDefault();
    if (!state?.payout_route_id) return;
    setBusy('destination'); setMessage('');
    try {
      if (state.destination_status) {
        const password = window.prompt('For security, enter your 44OS password to replace the payout email.');
        if (!password || !user?.email) throw new Error('Payout email replacement canceled.');
        const signedIn = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (signedIn.error) throw new Error('Reauthentication failed. Your payout email was not changed.');
      }
      await sellerRequest('/api/creator/seller/destination', await accessToken(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payoutEmail,
          routeId: state.payout_route_id,
        }),
      });
      setMessage('Wise email-to-claim destination saved. forty four will never receive your bank details.');
      await loadState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payout email could not be saved.');
    } finally { setBusy(''); }
  }

  if (loading || !user) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;

  const formLink = state?.expected_tax_form === 'w9'
    ? 'https://www.irs.gov/pub/irs-pdf/fw9.pdf'
    : 'https://www.irs.gov/pub/irs-pdf/fw8ben.pdf';

  return <PageShell>
    <div className="dashboard-page">
      <HubHero title="Creator Setup" copy="Complete this private setup before selling paid Items. Free publishing remains available." />
      {message ? <div className="dashboard-status ui44-status" role="status">{message}</div> : null}
      {state?.can_create_items ? <Ui44Panel overflow="visible">
        <h2 className="os-type-panel-title">Creator setup complete</h2>
        <p className="os-type-body">Your tax review and Wise email-to-claim destination are accepted.</p>
        <Link className="os-button os-button-primary" href="/studio/products/new">Upload an Item</Link>
      </Ui44Panel> : null}
      {state && !state.country_eligible ? <Ui44Panel overflow="visible">
        <h2 className="os-type-panel-title">Country route awaiting verification</h2>
        <p className="os-type-body">
          Your account country is {state.country_code || 'missing'}. forty four must verify a current Wise Business
          email-to-claim route before Creator promotion or onboarding can continue.
        </p>
      </Ui44Panel> : null}
      {state?.country_eligible && !state.can_create_items ? <>
        <Ui44Panel overflow="visible">
          <h2 className="os-type-panel-title">1. Seller self-certification</h2>
          <p className="os-type-body">Launch sellers must be natural persons acting for themselves.</p>
          <form className="dashboard-form" onSubmit={saveClassification}>
            <label className="dashboard-field"><span className="dashboard-field-label">Seller type</span>
              <Ui44SelectInput value={sellerType} onChange={event => setSellerType(event.target.value)}>
                <option value="individual">Individual acting for myself</option>
                <option value="entity">Corporation, partnership, trust, nonprofit, or other entity</option>
              </Ui44SelectInput>
            </label>
            <label className="dashboard-field"><span className="dashboard-field-label">U.S. person certification</span>
              <Ui44SelectInput required value={usPersonStatus} onChange={event => setUsPersonStatus(event.target.value)}>
                <option value="">Choose one</option>
                <option value="us_person">I certify I am a U.S. person</option>
                <option value="foreign_person">I certify I am not a U.S. person</option>
              </Ui44SelectInput>
            </label>
            <label className="dashboard-field"><span className="dashboard-field-label">Special tax circumstance</span>
              <Ui44SelectInput value={specialCase} onChange={event => setSpecialCase(event.target.value)}>
                <option value="none">None of these apply</option>
                <option value="possible_w8eci">Income may be effectively connected with a U.S. trade or business</option>
                <option value="possible_8233">I may need Form 8233</option>
                <option value="contradictory">My answers or documents may conflict</option>
                <option value="uncertain">I am uncertain</option>
              </Ui44SelectInput>
            </label>
            <button className="os-button os-button-primary" disabled={busy !== ''}>
              {busy === 'classification' ? 'Saving…' : 'Save certification'}
            </button>
          </form>
        </Ui44Panel>
        {state.expected_tax_form ? <Ui44Panel overflow="visible">
          <h2 className="os-type-panel-title">2. Tax form</h2>
          <p className="os-type-body">
            Complete and sign the official {state.expected_tax_form === 'w9' ? 'Form W-9 (March 2024)' : 'Form W-8BEN (October 2021)'}.
            The encrypted PDF is restricted from ordinary Admin screens, logs, email, analytics, and support history.
          </p>
          <p><a className="os-button os-button-secondary" href={formLink} target="_blank" rel="noreferrer">Open official IRS form</a></p>
          <form className="dashboard-form" onSubmit={uploadTaxForm}>
            <label className="dashboard-field"><span className="dashboard-field-label">Signed PDF</span>
              <Ui44FileInput accept="application/pdf" required onChange={event => setTaxFile(event.target.files?.[0] ?? null)} />
            </label>
            <label className="dashboard-field"><span className="dashboard-field-label">Date signed</span>
              <Ui44TextInput type="date" required value={signedAt} onChange={event => setSignedAt(event.target.value)} />
            </label>
            <label className="dashboard-check-row">
              <Ui44CheckboxInput checked={signatureConfirmed} required onChange={event => setSignatureConfirmed(event.target.checked)} />
              <span>I certify this is my completed form and that I signed it under the certification shown on the form.</span>
            </label>
            <button className="os-button os-button-primary" disabled={busy !== '' || !taxFile || !signatureConfirmed}>
              {busy === 'tax' ? 'Encrypting…' : 'Submit for restricted review'}
            </button>
          </form>
        </Ui44Panel> : null}
        <Ui44Panel overflow="visible">
          <h2 className="os-type-panel-title">3. Wise payout email</h2>
          <p className="os-type-body">
            At payout, Wise emails this address a secure claim link and collects the bank details from you.
            You do not need a Wise account, and 44OS does not store your bank information.
          </p>
          <form className="dashboard-form" onSubmit={savePayoutEmail}>
            <label className="dashboard-field"><span className="dashboard-field-label">Payout email</span>
              <Ui44TextInput type="email" autoComplete="email" required value={payoutEmail} onChange={event => setPayoutEmail(event.target.value)} />
            </label>
            {state.destination_masked ? <p className="os-type-meta">Current destination: {state.destination_masked}</p> : null}
            <button className="os-button os-button-primary" disabled={busy !== '' || !state.payout_route_id}>
              {busy === 'destination' ? 'Saving…' : state.destination_status ? 'Replace payout email' : 'Save payout email'}
            </button>
          </form>
        </Ui44Panel>
      </> : null}
    </div>
  </PageShell>;
}
