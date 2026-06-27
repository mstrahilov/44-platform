'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

export default function AuthControls() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

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
    setOpen(false);
  }

  if (loading) {
    return <div className="user-button" aria-hidden="true" />;
  }

  return (
    <div className="user-menu-wrap" ref={menuRef}>
      <button className={user ? 'user-button' : 'sign-in-button'} onClick={() => setOpen(value => !value)} aria-label={user ? 'Open account menu' : 'Open sign in menu'}>
        {user ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35" />
            <path d="M13.2 8.8c.04-.26.06-.53.06-.8s-.02-.54-.06-.8l1.22-.94-1.2-2.08-1.44.58a5.4 5.4 0 0 0-1.38-.8L10.18 2.4H5.82L5.6 3.96c-.5.2-.96.46-1.38.8l-1.44-.58-1.2 2.08 1.22.94c-.04.26-.06.53-.06.8s.02.54.06.8l-1.22.94 1.2 2.08 1.44-.58c.42.34.88.6 1.38.8l.22 1.56h4.36l.22-1.56c.5-.2.96-.46 1.38-.8l1.44.58 1.2-2.08-1.22-.94Z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35" />
            <path d="M13.2 8.8c.04-.26.06-.53.06-.8s-.02-.54-.06-.8l1.22-.94-1.2-2.08-1.44.58a5.4 5.4 0 0 0-1.38-.8L10.18 2.4H5.82L5.6 3.96c-.5.2-.96.46-1.38.8l-1.44-.58-1.2 2.08 1.22.94c-.04.26-.06.53-.06.8s.02.54.06.8l-1.22.94 1.2 2.08 1.44-.58c.42.34.88.6 1.38.8l.22 1.56h4.36l.22-1.56c.5-.2.96-.46 1.38-.8l1.44.58 1.2-2.08-1.22-.94Z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="user-menu">
          {user ? (
            <>
              <div className="user-menu-heading">
                <div className="user-menu-title">Account</div>
                <div className="user-menu-email">{user.email}</div>
              </div>
              <div className="user-menu-divider" />
              <Link className="user-menu-item" href="/community/creator-a" onClick={() => setOpen(false)}>Profile</Link>
              <button className="user-menu-item" type="button" disabled>Creator Dashboard</button>
              <button className="user-menu-item" type="button" disabled>Settings</button>
              <div className="user-menu-divider" />
              <button className="user-menu-item" type="button" onClick={signOut}>Sign Out</button>
            </>
          ) : (
            <>
              <div className="user-menu-heading">
                <div className="user-menu-title">Sign In</div>
                <div className="user-menu-email">Use your email to receive a login link.</div>
              </div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && signIn()}
                placeholder={message || 'Email'}
                style={{ fontSize: 12, padding: '9px 12px' }}
              />
              <button className="btn-primary" onClick={signIn} disabled={sending} style={{ width: '100%', padding: '9px 14px', fontSize: 11, marginTop: 8 }}>
                {sending ? 'Sending' : 'Send Link'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
