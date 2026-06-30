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
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
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
      options: { emailRedirectTo: window.location.href },
    });
    setSending(false);
    setMessage(error ? error.message : 'Check your email');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('');
    setOpen(false);
  }

  if (loading) return <div className="auth-avatar-btn" aria-hidden="true" />;

  const initial = user?.email?.[0]?.toUpperCase() ?? '';

  return (
    <div className="user-menu-wrap" ref={menuRef}>
      <button
        className={user ? 'auth-avatar-btn' : 'ctb-icon-btn'}
        onClick={() => setOpen(v => !v)}
        aria-label={user ? 'Open account menu' : 'Sign in'}
      >
        {user ? (
          initial ? (
            <span className="auth-avatar-initial">{initial}</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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

              <Link className="user-menu-item" href="/account" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Account
              </Link>

              <Link className="user-menu-item" href="/messages" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2h12v8H8l-3 2.5V10H1V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                Messages
              </Link>

              <Link className="user-menu-item" href="/friends" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 11c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M11 7.5c1.5.3 2.5 1.5 2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Friends
              </Link>

              <Link className="user-menu-item" href="/notifications" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1a4.5 4.5 0 0 1 4.5 4.5V8l.9 1.8H1.6L2.5 8V5.5A4.5 4.5 0 0 1 7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5.5 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3"/></svg>
                Notifications
              </Link>

              <Link className="user-menu-item" href="/achievements" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3 3.5.5-2.5 2.5.6 3.5L7 9l-3.1 1.5.6-3.5L2 4.5 5.5 4 7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                Achievements
              </Link>

              <div className="user-menu-divider" />

              <Link className="user-menu-item" href="/dashboard" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
                Dashboard
              </Link>

              <Link className="user-menu-item" href="/settings" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5v1.2M7 11.3v1.2M1.5 7h1.2M11.3 7h1.2M3.2 3.2l.85.85M9.95 9.95l.85.85M10.8 3.2l-.85.85M4.05 9.95l-.85.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Settings
              </Link>

              <div className="user-menu-divider" />

              <button className="user-menu-item" type="button" onClick={signOut}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6M10 9.5l2.5-2.5L10 4.5M5.5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <div className="user-menu-heading">
                <div className="user-menu-title">Sign In</div>
                <div className="user-menu-email">Enter your email to receive a login link.</div>
              </div>

              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder={message || 'Email'}
                style={{ fontSize: 12, padding: '9px 12px' }}
              />

              <button
                className="btn-primary"
                onClick={signIn}
                disabled={sending}
                style={{ width: '100%', padding: '9px 14px', fontSize: 11, marginTop: 8 }}
              >
                {sending ? 'Sending…' : 'Send Link'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
