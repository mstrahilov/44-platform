'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
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

    setSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/collection`,
      },
    });

    setSubmitting(false);
    setStatus(error ? error.message : 'Check your email for the sign-in link.');
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

          <h1 className="os-type-page-title" style={{ marginBottom: 10 }}>Sign in</h1>

          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 32, maxWidth: 380 }}>
            Enter your email and we&rsquo;ll send a secure, one-tap sign-in link.
          </p>

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
            <button
              className="os-button os-button-primary os-button-large"
              type="submit"
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {submitting ? 'Sending…' : 'Send Sign-In Link'}
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
