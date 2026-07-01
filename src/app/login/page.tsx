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
    <div className="panel-scroll">
      <section
        className="os-panel-surface"
        style={{
          width: 'min(720px, calc(100vw - 72px))',
          margin: '80px auto',
          padding: 36,
        }}
      >
        <p className="os-type-label" style={{ marginBottom: 16 }}>44OS Account</p>
        <h1 className="os-type-display" style={{ marginBottom: 14 }}>Sign in</h1>
        <p className="os-type-body" style={{ maxWidth: 520, marginBottom: 28, color: 'var(--os-color-ink-secondary)' }}>
          Enter your email and we will send a secure sign-in link.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            className="os-input-field os-input-large"
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={event => setEmail(event.target.value)}
          />
          <button className="os-button os-button-primary os-button-large" type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Sign-In Link'}
          </button>
        </form>

        {status && (
          <p className="os-type-body-small" style={{ marginTop: 18, color: 'var(--os-color-ink-secondary)' }}>
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
