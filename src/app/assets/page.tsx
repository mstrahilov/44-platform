import { permanentRedirect } from 'next/navigation';

export default function AssetsRedirect() {
  permanentRedirect('/store/assets');
}
