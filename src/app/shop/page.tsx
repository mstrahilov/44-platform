import { permanentRedirect } from 'next/navigation';

export default function ShopPage() {
  permanentRedirect('/browse/merch');
}
