'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { accountExistsForEmail, usernameIsTaken } from '@/lib/domain/accounts';
import { COUNTRIES } from '@/lib/marketPreferences';
import { getAppPathUrl } from '@/lib/siteUrl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { isValidUsername, sanitizeUsernameInput } from '@/lib/usernames';
import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';

type AuthStep = 'email' | 'password';

export type AuthExperienceProps = {
  variant: 'standalone' | 'account';
  authenticatedDestination: string | null;
};

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

export function AuthExperience({ variant, authenticatedDestination }: AuthExperienceProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [creatorAccountRequested, setCreatorAccountRequested] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  useEffect(() => {
    if (!loading && user && authenticatedDestination) router.replace(authenticatedDestination);
  }, [authenticatedDestination, loading, router, user]);

  async function continueWithEmail() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus('Enter your email address to continue.');
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const exists = await accountExistsForEmail(cleanEmail);
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
    const cleanUsername = username.trim();

    if (!accountExists && !cleanDisplayName) {
      setStatus('Enter your name to create your account.');
      return;
    }

    if (!accountExists && !isValidUsername(cleanUsername)) {
      setStatus('Use 3–32 letters, numbers, or underscores for your username.');
      return;
    }
    if (!accountExists && !COUNTRIES.some(country => country.code === countryCode)) {
      setStatus('Choose the country where you live.');
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
      if (authenticatedDestination) router.push(authenticatedDestination);
      return;
    }

    let existingUsername = false;
    try {
      existingUsername = await usernameIsTaken(cleanUsername);
    } catch {
      setSubmitting(false);
      setStatus('We could not check that username right now. Please try again.');
      return;
    }

    if (existingUsername) {
      setSubmitting(false);
      setStatus('That username is already taken. Choose another one.');
      return;
    }

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName: cleanDisplayName,
        username: cleanUsername,
        countryCode,
        creatorAccountRequested,
      }),
    });
    const data = await response.json() as {
      error?: string;
      session?: { accessToken: string; refreshToken: string } | null;
    };
    setSubmitting(false);
    if (!response.ok) {
      setStatus(authMessage(data.error));
      return;
    }

    if (data.session) {
      const sessionResult = await supabase.auth.setSession({ access_token: data.session.accessToken, refresh_token: data.session.refreshToken });
      if (sessionResult.error) {
        setStatus(authMessage(sessionResult.error.message));
        return;
      }
      router.replace('/welcome');
      return;
    }
    setSignupComplete(true);
    setStatus(creatorAccountRequested
      ? 'Check your email to verify your address. The link opens Creator setup; publishing remains locked until 44 completes its review.'
      : 'Check your email to verify your address. The link opens your welcome page.');
  }

  async function sendEmailLink() {
    if (linkSubmitting) return;
    setLinkSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAppPathUrl('/'), shouldCreateUser: false },
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
      options: { emailRedirectTo: getAppPathUrl('/welcome') },
    });
    setResendingConfirmation(false);
    setStatus(error ? authMessage(error.message) : 'Verification email resent. Check your inbox and spam folder.');
  }

  function changeEmail() {
    setStep('email');
    setPassword('');
    setDisplayName('');
    setUsername('');
    setCountryCode('');
    setCreatorAccountRequested(false);
    setAccountExists(null);
    setSignupComplete(false);
    setStatus(null);
  }

  const isLogin = accountExists === true;
  const titleId = variant === 'account' ? 'account-auth-title' : 'login-title';

  return (
    <section className="login-shell" aria-labelledby={titleId} data-auth-variant={variant}>
      <div className="login-copy">
        <h1 id={titleId} className="os-type-page-title ui44-type ui44-type-page-title">
          {step === 'email' ? '44OS' : isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="os-type-body">
          {step === 'email'
            ? 'Enter your email to get started.'
            : isLogin
              ? 'Enter your password to log in.'
              : 'Add your public name, username, and country, then choose a password. We’ll email you if verification is required.'}
        </p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {step === 'email' ? (
          <label className="login-field">
            <span className="os-type-field-title">Email</span>
            <Ui44TextInput
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
                <Ui44TextInput
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
                <span className="os-type-field-title">Country</span>
                <Ui44SelectInput
                  value={countryCode}
                  required
                  autoComplete="country"
                  onChange={event => {
                    setCountryCode(event.target.value);
                    setStatus(null);
                  }}
                >
                  <option value="">Choose your country</option>
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </Ui44SelectInput>
              </label>
            )}
            {!isLogin && (
              <label className="login-field">
                <span className="os-type-field-title">Username</span>
                <Ui44TextInput
                  className="os-input-field os-input-large"
                  type="text"
                  value={username}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9_]{3,32}"
                  required
                  onChange={event => {
                    setUsername(sanitizeUsernameInput(event.target.value));
                    setStatus(null);
                  }}
                />
              </label>
            )}
            {!isLogin && (
              <label className="login-creator-request">
                <Ui44CheckboxInput
                  checked={creatorAccountRequested}
                  onChange={event => {
                    setCreatorAccountRequested(event.target.checked);
                    setStatus(null);
                  }}
                />
                <span>
                  <strong>Set up a Creator profile</strong>
                  <small>Start shaping your Creator space now. Publishing unlocks only after 44 reviews the profile.</small>
                </span>
              </label>
            )}
            <label className="login-field">
              <span className="os-type-field-title">Password</span>
              <Ui44TextInput
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
        {step === 'password' && isLogin && (
          <Link className="os-button os-button-ghost os-button-compact login-link-action" href="/account/recovery">
            Forgot password?
          </Link>
        )}
      </form>

      {status && <p className="login-status os-type-body-small" role="status" aria-live="polite">{status}</p>}

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
  );
}
