'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { getSitePathUrl } from '@/lib/siteUrl';

type AuthStep = 'email' | 'password';

function authMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('rate limit')) {
    return 'Too many email requests were made. Please wait a moment and try again.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Check your email to verify your account before logging in.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'That password is incorrect. Try again or use an email login link.';
  }
  return message ?? 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/store');
  }, [loading, router, user]);

  async function findAccount(cleanEmail: string) {
    const { data, error } = await supabase.rpc('account_exists_for_email', {
      lookup_email: cleanEmail,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function continueWithEmail() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus('Enter your email address to continue.');
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const exists = await findAccount(cleanEmail);
      setEmail(cleanEmail);
      setAccountExists(exists);
      setStep('password');
    } catch {
      setStatus('We could not check that email right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 'email') {
      await continueWithEmail();
      return;
    }

    if (password.length < 8) {
      setStatus('Use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    if (accountExists) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) {
        setStatus(authMessage(error.message));
        return;
      }
      router.push('/store');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getSitePathUrl('/store') },
    });
    setSubmitting(false);
    if (error) {
      setStatus(authMessage(error.message));
      return;
    }
    setSignupComplete(true);
    setStatus('Account created. Check your email to verify your address.');
  }

  async function sendEmailLink() {
    if (linkSubmitting) return;
    setLinkSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getSitePathUrl('/store'), shouldCreateUser: false },
    });
    setLinkSubmitting(false);
    setStatus(error ? authMessage(error.message) : 'Check your email for your login link.');
  }

  async function resendConfirmation() {
    if (resendingConfirmation) return;
    setResendingConfirmation(true);
    setStatus(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getSitePathUrl('/store') },
    });
    setResendingConfirmation(false);
    setStatus(error ? authMessage(error.message) : 'Verification email resent. Check your inbox and spam folder.');
  }

  function changeEmail() {
    setStep('email');
    setPassword('');
    setAccountExists(null);
    setSignupComplete(false);
    setStatus(null);
  }

  const isLogin = accountExists === true;

  return (
    <div className="login-page page-scroll">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-copy">
          <h1 id="login-title" className="os-type-page-title">
            {step === 'email' ? '44OS' : isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="os-type-body">
            {step === 'email'
              ? 'Enter your email to get started.'
              : isLogin
                ? 'Enter your password to log in.'
                : 'Choose a password to create your account.'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {step === 'email' ? (
            <label className="login-field">
              <span className="os-type-field-title">Email</span>
              <input
                className="os-input-field os-input-large"
                type="email"
                value={email}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
                onChange={event => {
                  setEmail(event.target.value);
                  setStatus(null);
                }}
              />
            </label>
          ) : (
            <>
              <div className="login-email-summary">
                <span>{email}</span>
                <button type="button" onClick={changeEmail}>Change</button>
              </div>
              <label className="login-field">
                <span className="os-type-field-title">Password</span>
                <input
                  className="os-input-field os-input-large"
                  type="password"
                  value={password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                  autoFocus
                  onChange={event => {
                    setPassword(event.target.value);
                    setStatus(null);
                  }}
                />
              </label>
            </>
          )}

          <button
            className="os-button os-button-primary os-button-large login-primary-action"
            type="submit"
            disabled={submitting || signupComplete}
          >
            {submitting
              ? step === 'email' ? 'Checking…' : 'Working…'
              : step === 'email' ? 'Continue' : isLogin ? 'Log in' : signupComplete ? 'Account created' : 'Create account'}
          </button>

          {step === 'password' && isLogin && (
            <button
              className="os-button os-button-primary os-button-large login-primary-action"
              type="button"
              onClick={() => void sendEmailLink()}
              disabled={linkSubmitting || submitting}
            >
              {linkSubmitting ? 'Sending…' : 'Send login link'}
            </button>
          )}
        </form>

        {status && <p className="login-status os-type-body-small" role="status">{status}</p>}

        {signupComplete && (
          <button
            className="os-button os-button-ghost os-button-compact login-link-action"
            type="button"
            onClick={() => void resendConfirmation()}
            disabled={resendingConfirmation}
          >
            {resendingConfirmation ? 'Resending…' : 'Resend verification email'}
          </button>
        )}
      </section>
    </div>
  );
}
