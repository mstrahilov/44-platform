import { PageShell, EmptyPanel } from '@/components/Ui';

export default function CheckoutPage() {
  return (
    <PageShell>
      <h1 className="browse-page-title os-type-display">Checkout</h1>
      <EmptyPanel title="Checkout is coming soon" body="Payments and order processing are still being wired up." />
    </PageShell>
  );
}
