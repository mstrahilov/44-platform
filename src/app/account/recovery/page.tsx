'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getAppPathUrl } from '@/lib/siteUrl';
import { Ui44TextInput } from '@/components/ui44/Inputs';

type RecoveryMode = 'request' | 'reset' | 'complete';

export default function AccountRecoveryPage() {
  const [mode, setMode] = useState<RecoveryMode>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session && window.location.hash) setMode('reset');
    });
    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      if (active && event === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setSubmitting(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getAppPathUrl('/account/recovery'),
    });
    setSubmitting(false);
    setStatus(error
      ? error.message
      : 'If an account exists for that email, a recovery link is on its way. Use the newest email and check spam if it does not arrive.');
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmation) {
      setStatus('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setPassword('');
    setConfirmation('');
    setMode('complete');
    setStatus('Your password has been updated.');
  }

  return (
    <main className="login-page page-scroll">
      <section className="login-shell" aria-labelledby="recovery-title">
        <div className="login-copy">
          <h1 id="recovery-title" className="os-type-page-title ui44-type ui44-type-page-title">
            {mode === 'request' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Password updated'}
          </h1>
          <p className="os-type-body">
            {mode === 'request'
              ? 'Enter your account email and we will send a secure recovery link.'
              : mode === 'reset'
                ? 'This recovery session is temporary. Choose a new password to finish.'
                : 'You can return to 44OS with your new password.'}
          </p>
        </div>

        {mode === 'request' ? (
          <form className="login-form" onSubmit={requestReset}>
            <label className="login-field">
              <span className="os-type-field-title">Email</span>
              <Ui44TextInput className="os-input-field os-input-large" type="email" value={email} autoComplete="email" required onChange={event => setEmail(event.target.value)} />
            </label>
            <button className="os-button os-button-primary os-button-large login-primary-action" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send recovery link'}
            </button>
          </form>
        ) : mode === 'reset' ? (
          <form className="login-form" onSubmit={savePassword}>
            <label className="login-field"><span className="os-type-field-title">New password</span><Ui44TextInput className="os-input-field os-input-large" type="password" value={password} autoComplete="new-password" minLength={8} required onChange={event => setPassword(event.target.value)} /></label>
            <label className="login-field"><span className="os-type-field-title">Confirm password</span><Ui44TextInput className="os-input-field os-input-large" type="password" value={confirmation} autoComplete="new-password" minLength={8} required onChange={event => setConfirmation(event.target.value)} /></label>
            <button className="os-button os-button-primary os-button-large login-primary-action" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</button>
          </form>
        ) : <Link className="os-button os-button-primary os-button-large login-primary-action" href="/login">Return to Log In</Link>}

        {status && <p className="login-status os-type-body-small" role="status" aria-live="polite">{status}</p>}
        {mode === 'request' && <Link className="os-button os-button-ghost os-button-compact login-link-action" href="/login">Back to Log In</Link>}
      </section>
    </main>
  );
}
