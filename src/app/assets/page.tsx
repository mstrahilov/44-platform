import { permanentRedirect } from 'next/navigation';

export default function AssetsRedirect() {
  permanentRedirect('/browse/assets');
}
