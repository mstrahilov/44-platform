import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { OS44Button } from '@/components/OS44Button';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Check your email',
    description: 'Confirm your email address to finish setting up your 44OS account.',
    path: '/account/confirmation',
  }),
  robots: { index: false, follow: false },
};

export default function AccountConfirmationPage() {
  return (
    <main className="login-page page-scroll">
      <section className="login-shell account-confirmation-shell" aria-labelledby="account-confirmation-title">
        <div className="login-copy">
          <p className="account-confirmation-eyebrow">ACCOUNT CREATED</p>
          <h1 id="account-confirmation-title" className="os-type-page-title ui44-type ui44-type-page-title">
            Check your email
          </h1>
          <p className="os-type-body">
            We sent a confirmation link to your inbox. Open it to verify your email and continue to Profile Edit to finish setting up your account.
          </p>
        </div>

        <OS44Button className="os-button os-button-primary os-button-large login-primary-action" href="/login">
          Return to Log In
        </OS44Button>
      </section>
    </main>
  );
}
