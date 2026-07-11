'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { getSitePathUrl } from '@/lib/siteUrl';

type AuthStep = 'email' | 'password';

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

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
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const authenticatedDestination = useRef('/store');

  useEffect(() => {
    if (!loading && user) router.replace(authenticatedDestination.current);
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

    const cleanDisplayName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!accountExists && !cleanDisplayName) {
      setStatus('Enter your name to create your account.');
      return;
    }

    if (!accountExists && !USERNAME_PATTERN.test(cleanUsername)) {
      setStatus('Use 3–32 lowercase letters, numbers, or underscores for your username.');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    if (accountExists) {
      authenticatedDestination.current = '/store';
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) {
        setStatus(authMessage(error.message));
        return;
      }
      router.push('/store');
      return;
    }

    const { data: existingUsername, error: usernameError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (usernameError) {
      setSubmitting(false);
      setStatus('We could not check that username right now. Please try again.');
      return;
    }

    if (existingUsername) {
      setSubmitting(false);
      setStatus('That username is already taken. Choose another one.');
      return;
    }

    authenticatedDestination.current = '/profile';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getSitePathUrl('/profile'),
        data: {
          display_name: cleanDisplayName,
          name: cleanDisplayName,
          username: cleanUsername,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      authenticatedDestination.current = '/store';
      setStatus(authMessage(error.message));
      return;
    }

    if (data.session) {
      router.replace('/profile');
      return;
    }
    setSignupComplete(true);
    setStatus('Check your email to verify your address. The link will take you straight to your profile.');
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
      options: { emailRedirectTo: getSitePathUrl('/profile') },
    });
    setResendingConfirmation(false);
    setStatus(error ? authMessage(error.message) : 'Verification email resent. Check your inbox and spam folder.');
  }

  function changeEmail() {
    setStep('email');
    setPassword('');
    setDisplayName('');
    setUsername('');
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
                : 'Add your public name and username, then choose a password. We’ll email you if verification is required.'}
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
              {!isLogin && (
                <label className="login-field">
                  <span className="os-type-field-title">Name</span>
                  <input
                    className="os-input-field os-input-large"
                    type="text"
                    value={displayName}
                    autoComplete="name"
                    maxLength={80}
                    required
                    autoFocus
                    onChange={event => {
                      setDisplayName(event.target.value);
                      setStatus(null);
                    }}
                  />
                </label>
              )}
              {!isLogin && (
                <label className="login-field">
                  <span className="os-type-field-title">Username</span>
                  <input
                    className="os-input-field os-input-large"
                    type="text"
                    value={username}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    minLength={3}
                    maxLength={32}
                    pattern="[a-z0-9_]{3,32}"
                    required
                    onChange={event => {
                      setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
                      setStatus(null);
                    }}
                  />
                </label>
              )}
              <label className="login-field">
                <span className="os-type-field-title">Password</span>
                <input
                  className="os-input-field os-input-large"
                  type="password"
                  value={password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                  autoFocus={isLogin}
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
