# 44OS authentication email setup

44OS authentication mail is triggered by Supabase Auth and delivered through Resend. Under the approved no-cost/one-domain boundary, users should see `44OS <accounts@44os.com>`; Supabase must not appear as the sender identity.

**Implementation status — closed July 17, 2026:** hosted Supabase Auth is actively cut over to the verified root `44os.com` Resend sender with the repository's eight branded templates. The owner deferred the real-inbox matrix below to a later release-acceptance task so the implementation goal could close. Do not interpret that closure as evidence that the received-message journeys passed.

Resend Free permits one verified domain. Use root `44os.com` as that single sending domain so Resend can send as `accounts@44os.com`, `support@44os.com`, and `news@44os.com`. `auth.44os.com` remains the custom Supabase authorization/link domain and does not need to match the From domain. This free-plan compromise shares sending reputation, so disable click/open tracking for the verified domain, keep Auth rate-limited, enforce newsletter consent/unsubscribe independently, and monitor bounces/complaints. Do not enable Resend Receiving on root `44os.com` or replace existing inbound MX records without a separate mailbox migration review.

## Resend

1. After capturing the working domain and hosted SMTP settings for rollback, add and verify root `44os.com` in Resend. The free plan cannot retain both Resend domains; do not remove the working `auth.44os.com` Resend entry until the root DNS records are ready and the cutover can be rehearsed immediately.
2. Add the DKIM and SPF records Resend provides to the 44OS DNS zone.
3. Review the existing root DMARC and SPF records before adding or changing anything. Add the exact Resend DKIM/return-path records without overwriting the root mailbox provider's MX records.
4. Keep click and open tracking disabled for authentication mail so single-use links are not rewritten.
5. Create an SMTP credential for Supabase and keep it in the secret manager. Never place it in this repository or a public client variable.

### Captured pre-cutover state — July 16, 2026

- Resend `auth.44os.com`: verified in `us-east-1`, sending enabled; DKIM at `resend._domainkey.auth` and return-path MX/SPF below `send.auth`, all with one-hour GoDaddy TTLs.
- Root DNS: no inbound MX was present in the captured ten-record GoDaddy zone. `send.auth` is a Resend return-path MX and does not make `support@44os.com` receivable.
- Hosted Supabase: built-in email service active and custom SMTP disabled. Site URL and the three captured redirects match the list below. New-user signup, email provider, email confirmation, and secure email change are on; manual linking and anonymous sign-in are off. Secure email change requires confirmation from both the old and new addresses. Built-in Auth email is limited to 2 messages/hour. All seven visible Security notifications are off, including password-changed and email-address-changed notices.
- Captured provider policy: secure password change off; require-current-password off; leaked-password prevention off; minimum password length 6; no additional password-requirement option selected; email OTP/link expiration 3,600 seconds; email OTP length 8 digits. These are rollback facts, not target recommendations, and no setting was changed during capture.
- This is evidence of a working Resend sending domain, not evidence that hosted Auth currently sends through Resend.

All eight captured editors are unbranded hosted templates. Their exact pre-cutover subjects and source are preserved below. Password changed and Email address changed are both disabled in the hosted project.

### Confirm signup

Subject: `Confirm your email address`

```html
<h2>Confirm your email address</h2>

<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

### Invite user

Subject: `You've been invited`

```html
<h2>You've been invited</h2>

<p>You've been invited to create an account. Follow the link below to accept.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
```

### Magic link or OTP

Subject: `Your sign-in link`

```html
<h2>Your sign-in link</h2>

<p>Follow the link below to sign in. This link expires shortly and can only be used once.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

### Change email address

Subject: `Confirm your new email address`

```html
<h2>Confirm your new email address</h2>

<p>Follow the link below to confirm {{ .NewEmail }} as your new email address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email address</a></p>

<p>If you didn't request this change, you can safely ignore this email.</p>
```

### Reset password

Subject: `Reset your password`

```html
<h2>Reset your password</h2>

<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>

<p>If you didn't request this, you can safely ignore this email.</p>
```

### Reauthentication

Subject: `{{ .Token }} is your verification code`

```html
<h2>Your verification code</h2>

<p>Use the code below to verify your identity. It expires shortly.</p>

<p>{{ .Token }}</p>
```

### Password changed — disabled

Subject: `Your password was changed`

```html
<h2>Your password was changed</h2>

<p>The password for your account was recently changed.</p>

<p>If you didn't make this change, reset your password and contact support immediately.</p>
```

### Email address changed — disabled

Subject: `Your email address was changed`

```html
<h2>Your email address was changed</h2>

<p>The email address for your account was changed from {{ .OldEmail }} to {{ .Email }}.</p>

<p>If you didn't make this change, contact support immediately.</p>
```

## Applied hosted Supabase project configuration — July 16, 2026

The owner approved the hosted Auth cutover while the application and linked database remain undeployed. The repository templates were applied through Supabase's authenticated Management API after the Dashboard editor accepted the form state but did not persist it. A fresh independent Management API read then proved all eight hosted bodies match the repository files byte-for-byte.

- Site URL: `https://44os.com`
- Allowed redirect URLs preserved: `http://localhost:3000/**`, `https://44os.com/**`, and `https://www.44os.com/**`
- Email confirmations: enabled
- Secure email changes: enabled
- Custom SMTP: enabled
- SMTP host: `smtp.resend.com`
- SMTP port: `465`
- SMTP user: `resend`
- SMTP password: a Resend sending-only credential restricted to verified domain `44os.com`, stored only in Supabase
- Sender email: `accounts@44os.com`
- Sender name: `44OS`
- Auth email rate limit: 30/hour
- Email OTP: 8 digits, expiring after 3,600 seconds
- Password-changed notification: enabled with the repository template
- Email-address-changed notification: enabled with the repository template
- Phone, sign-in-method, and MFA notifications: disabled
- New-user signup and email confirmation: enabled; automatic confirmation remains disabled

The installed subjects are `Confirm your 44OS email`, `You are invited to 44OS`, `Your 44OS sign-in link`, `Confirm your new 44OS email`, `Reset your 44OS password`, `{{ .Token }} is your 44OS verification code`, `Your 44OS password was changed`, and `Your 44OS email was changed`. No unrelated Auth policy was changed.

`accounts@44os.com` is currently a verified outbound identity, not a confirmed iCloud inbox. Because iCloud catch-all is off, direct replies to that address may not arrive until the owner adds it as a second custom-domain address. Every Auth template gives users the monitored `support@44os.com` route, so this does not block outbound rehearsal; adding the alias is a separate owner mailbox action.

## Acceptance rehearsal

Use real inboxes on at least two providers and verify:

1. New fan signup receives the 44OS confirmation email and cannot sign in before confirming.
2. The confirmation link returns to `https://44os.com/profile` and establishes a valid session.
3. Resend confirmation works and respects the configured cooldown.
4. Magic-link login returns to `https://44os.com/store`.
5. Password recovery opens `https://44os.com/account/recovery`, accepts a new password, and the old password no longer works.
6. Email change requires both confirmations and sends the security notification.
7. Password change sends the security notification.
8. Sender, DKIM, SPF, and DMARC pass in the received-message headers; no links are rewritten.
9. Resend delivery, bounce, and complaint events are visible and monitored.

No real Auth message was sent during the unattended cutover. Do not treat configuration equality as delivery acceptance. The owner-controlled real-inbox rehearsal above remains required before public launch; confirmation and recovery must pass end to end before public signup is accepted.

### Owner walk-through — no application deployment required

The hosted Auth SMTP/templates are already active, so this first rehearsal can run before deploying the local application-email system:

1. Choose two owner-controlled inboxes at different providers. Do not post either password, one-time code, SMTP key, or message source in chat. A disposable plus-address is acceptable only if its provider delivers it as a distinct signup address.
2. In a private browser window, open `https://44os.com/login`, create the first account, and stop at “Check your email.” Record the local time.
3. In the inbox, verify the visible sender is `44OS <accounts@44os.com>`, the subject is `Confirm your 44OS email`, the 44OS design is intact on desktop/mobile, and no provider branding appears. Do not click yet.
4. Return to 44OS and use **Resend verification email** once. Confirm only one additional message arrives and the UI reports success rather than leaking a provider error.
5. Open the newest confirmation link. It must use the working `auth.44os.com` authorization domain, return to `/profile`, and establish a valid session. Confirm the unverified account could not sign in before this step.
6. Log out. Use **Email me a login link** and confirm the `Your 44OS sign-in link` message returns to `/store`.
7. Use **Forgot password**. Confirm `Reset your 44OS password` opens `/account/recovery`, accepts a new password, and the old password no longer works. Verify the separate password-changed notice arrives.
8. From Settings, change the account email to the second controlled inbox. Secure email change must require both old- and new-address confirmations, then send the email-address-changed notice.
9. In each provider's “show original/message details” view, verify SPF, DKIM, and DMARC pass; links are not replaced by a tracking hostname; and the From domain is `44os.com`. Do not copy authentication tokens or full headers into repository documentation.
10. In Resend, inspect the Messages list for the test messages and record only sanitized delivery status/timestamps. Open/click tracking must remain absent.
11. Send an ordinary reply only if intentionally testing the reply path. `accounts@44os.com` is not yet a confirmed iCloud alias, so use the explicit `support@44os.com` link in the template. Adding `accounts@44os.com` as a second iCloud address is an optional owner mailbox improvement, not an Auth delivery requirement.
12. Record pass/fail evidence in `Other/44OS_MILESTONES.md`. Any failed confirmation, recovery, authentication-header, or unrewritten-link check keeps public signup unaccepted.
