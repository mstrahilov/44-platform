import { permanentRedirect } from 'next/navigation';

export default function BooksDiscoverPage() {
  permanentRedirect('/store/books');
}
