import { permanentRedirect } from 'next/navigation';

export default function LegacyLibraryRedirect() {
  permanentRedirect('/library');
}
