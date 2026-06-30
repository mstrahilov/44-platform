import { PageShell, EmptyPanel } from '@/components/Ui';

export default function CartPage() {
  return (
    <PageShell>
      <h1 className="browse-page-title os-type-display">Cart</h1>
      <EmptyPanel title="Your cart is empty" body="Browse the store and add items — checkout is coming soon." />
    </PageShell>
  );
}
