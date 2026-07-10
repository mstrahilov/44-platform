'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { getSitePathUrl } from '@/lib/siteUrl';

function authMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('rate limit')) {
    return 'Supabase email limits are temporarily reached. Wait a bit before requesting another email, or use Sign In if this account already has a password.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Check your email to verify this account before signing in.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'That email and password did not match. Try again or request an email link.';
  }
  return message ?? 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [signinMethod, setSigninMethod] = useState<'password' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [lastSignupEmail, setLastSignupEmail] = useState('');
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    if (mode === 'signup' && !cleanName) {
      setStatus('Add your name to create your account.');
      return;
    }
    if ((mode === 'signup' || signinMethod === 'password') && password.length < 8) {
      setStatus('Use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: getSitePathUrl('/'),
          data: {
            name: cleanName,
            display_name: cleanName,
          },
        },
      });
      setSubmitting(false);
      if (!error) setLastSignupEmail(cleanEmail);
      setStatus(error ? authMessage(error.message) : 'Account created. Check your email to verify it, then finish your community profile.');
      return;
    }

    if (mode === 'signin' && signinMethod === 'password') {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      setSubmitting(false);
      if (error) {
        setStatus(authMessage(error.message));
        return;
      }
      router.push('/store');
      return;
    }

    setSubmitting(false);
  }

  async function sendEmailLink() {
    const cleanEmail = email.trim();
    if (!cleanEmail || linkSubmitting) return;

    setLinkSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: getSitePathUrl('/store'),
      },
    });

    setLinkSubmitting(false);
    setStatus(error ? authMessage(error.message) : 'Check your email for the account link.');
  }

  async function resendConfirmation() {
    const cleanEmail = (lastSignupEmail || email).trim();
    if (!cleanEmail || resendingConfirmation) return;

    setResendingConfirmation(true);
    setStatus(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: getSitePathUrl('/'),
      },
    });
    setResendingConfirmation(false);
    setLastSignupEmail(cleanEmail);
    setStatus(error ? authMessage(error.message) : 'Confirmation email resent. Check your inbox and spam folder.');
  }

  return (
    <div className="page-scroll">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '40px 24px',
      }}>
        <div className="os-panel-surface" style={{
          width: 'min(480px, 100%)',
          padding: '40px 44px',
          display: 'grid',
          gap: 0,
        }}>
          <p className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 12 }}>
            44OS
          </p>

          <h1 className="os-type-page-title" style={{ marginBottom: 10 }}>
            {mode === 'signup' ? 'Create your account' : 'Log in'}
          </h1>

          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 32, maxWidth: 380 }}>
            {mode === 'signup'
              ? 'Use your name, email, and password to create your account. After verification, you will choose a username and profile photo for Community.'
              : 'Log in to use your library, community identity, and creator tools.'}
          </p>

          <div className="settings-segment" role="group" aria-label="Account mode" style={{ marginBottom: 16 }}>
            {[
              { id: 'signup', label: 'Sign Up' },
              { id: 'signin', label: 'Log In' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
              onClick={() => {
                setMode(item.id as 'signup' | 'signin');
                setSigninMethod(null);
                setStatus(null);
              }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            {mode === 'signup' && (
              <input
                className="os-input-large"
                type="text"
                value={name}
                placeholder="Your name"
                autoComplete="name"
                onChange={event => setName(event.target.value)}
                style={{ width: '100%' }}
              />
            )}
            <input
              className="os-input-large"
              type="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={event => setEmail(event.target.value)}
              style={{ width: '100%' }}
            />
            {(mode === 'signup' || signinMethod === 'password') && (
              <input
                className="os-input-large"
                type="password"
                value={password}
                placeholder="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                onChange={event => setPassword(event.target.value)}
                style={{ width: '100%' }}
              />
            )}

            {mode === 'signup' ? (
              <button
                className="os-button os-button-primary os-button-large"
                type="submit"
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {submitting ? 'Working…' : 'Create Account'}
              </button>
            ) : signinMethod === 'password' ? (
              <>
                <button
                  className="os-button os-button-primary os-button-large"
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'Working…' : 'Sign in with password'}
                </button>
                <button
                  className="os-button os-button-ghost os-button-compact"
                  type="button"
                  onClick={() => {
                    setSigninMethod(null);
                    setPassword('');
                    setStatus(null);
                  }}
                  disabled={submitting}
                  style={{ justifySelf: 'center' }}
                >
                  Use email link instead
                </button>
              </>
            ) : (
              <>
                <button
                  className="os-button os-button-primary os-button-large"
                  type="button"
                  onClick={() => {
                    if (!email.trim()) {
                      setStatus('Enter your email first.');
                      return;
                    }
                    setSigninMethod('password');
                    setStatus(null);
                  }}
                  disabled={submitting || linkSubmitting}
                  style={{ width: '100%' }}
                >
                  Sign in with password
                </button>
                <button
                  className="os-button os-button-secondary os-button-large"
                  type="button"
                  onClick={() => void sendEmailLink()}
                  disabled={linkSubmitting || submitting}
                  style={{ width: '100%' }}
                >
                  {linkSubmitting ? 'Sending…' : 'Send email sign-in link'}
                </button>
              </>
            )}
          </form>

          {status && (
            <p className="os-type-body-small" style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: 'var(--os-radius-3)',
              background: 'var(--os-paper-bg-soft)',
              border: '1px solid var(--os-paper-border)',
              color: 'var(--os-color-ink-secondary)',
            }}>
              {status}
            </p>
          )}

          {mode === 'signup' && lastSignupEmail && (
            <button
              className="os-button os-button-ghost os-button-compact"
              type="button"
              onClick={() => void resendConfirmation()}
              disabled={resendingConfirmation || submitting}
              style={{ justifySelf: 'center', marginTop: 14 }}
            >
              {resendingConfirmation ? 'Resending…' : 'Resend confirmation email'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
