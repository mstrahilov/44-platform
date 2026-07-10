import { permanentRedirect } from 'next/navigation';

export default function BooksStorePage() {
  permanentRedirect('/browse/books');
}
