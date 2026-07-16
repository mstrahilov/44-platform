import type { Metadata } from 'next';
import { UiSystemReferencePage } from '@/components/UiSystemReferencePage';
import { loadUiSystemInventory } from '@/lib/uiSystemInventory';
import '@/styles/44-ui/system-reference.css';

export const metadata: Metadata = {
  title: '44OS UI',
  description: 'The living materials, components, and CSS reference for 44OS.',
};

export default function FortyFourOsUiPage() {
  return <UiSystemReferencePage inventory={loadUiSystemInventory()} />;
}
