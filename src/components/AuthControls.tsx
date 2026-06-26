'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

export default function AuthControls() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function signIn() {
    if (!email || sending) return;

    setSending(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    setSending(false);
    setMessage(error ? error.message : 'Check your email');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('');
  }

  if (loading) {
    return <div style={{ width: 160 }} />;
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.42)' }}>
          {user.email}
        </div>
        <button className="btn-ghost" onClick={signOut} style={{ padding: '8px 14px', fontSize: 11 }}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 180 }}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && signIn()}
          placeholder={message || 'Email'}
          style={{ fontSize: 12, padding: '8px 12px' }}
        />
      </div>
      <button className="btn-primary" onClick={signIn} disabled={sending} style={{ padding: '8px 14px', fontSize: 11 }}>
        {sending ? 'Sending' : 'Sign In'}
      </button>
    </div>
  );
}
