'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

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
  const [mode, setMode] = useState<'signup' | 'signin' | 'link'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/collection');
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    if (mode !== 'link' && password.length < 8) {
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
          emailRedirectTo: `${window.location.origin}/account`,
        },
      });
      setSubmitting(false);
      setStatus(error ? authMessage(error.message) : 'Account created. Check your email to verify it, then finish your community profile.');
      return;
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      setSubmitting(false);
      if (error) {
        setStatus(authMessage(error.message));
        return;
      }
      router.push('/account');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setSubmitting(false);
    setStatus(error ? authMessage(error.message) : 'Check your email for the account link.');
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
            44 Platform
          </p>

          <h1 className="os-type-page-title" style={{ marginBottom: 10 }}>
            {mode === 'signup' ? 'Create your account' : mode === 'signin' ? 'Sign in' : 'Email me a link'}
          </h1>

          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 32, maxWidth: 380 }}>
            {mode === 'signup'
              ? 'Use your email and password to create access to 44. After verification, you will choose a username and profile photo for community.'
              : mode === 'signin'
                ? 'Sign in to use your collection, community identity, and creator tools.'
                : 'Enter your email and we will send a secure one-tap account link.'}
          </p>

          <div className="settings-segment" role="group" aria-label="Account mode" style={{ marginBottom: 16 }}>
            {[
              { id: 'signup', label: 'Sign Up' },
              { id: 'signin', label: 'Sign In' },
              { id: 'link', label: 'Email Link' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                onClick={() => {
                  setMode(item.id as 'signup' | 'signin' | 'link');
                  setStatus(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <input
              className="os-input-large"
              type="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={event => setEmail(event.target.value)}
              style={{ width: '100%' }}
            />
            {mode !== 'link' && (
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
            <button
              className="os-button os-button-primary os-button-large"
              type="submit"
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {submitting ? 'Working…' : mode === 'signup' ? 'Create Account' : mode === 'signin' ? 'Sign In' : 'Send Account Link'}
            </button>
          </form>

          {status && (
            <p className="os-type-body-small" style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: 'var(--os-radius-3)',
              background: 'var(--os-glass-recessed-bg)',
              border: '1px solid var(--os-glass-recessed-border)',
              color: 'var(--os-color-ink-secondary)',
            }}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
