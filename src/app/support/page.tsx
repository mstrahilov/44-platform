import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';

export default function SupportPage() {
  return (
    <PageShell>
      <main className="app-page">
        <HubHero title="Support" copy="Help center and account support for 44OS." />
        <EmptyMessage>Support is coming soon.</EmptyMessage>
      </main>
    </PageShell>
  );
}
