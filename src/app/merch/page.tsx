import { permanentRedirect } from 'next/navigation';

export default function MerchRedirect() {
  permanentRedirect('/browse/merch');
}
