import { permanentRedirect } from 'next/navigation';

export default function HomeRootPage() {
  permanentRedirect('/browse');
}
