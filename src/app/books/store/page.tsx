import { permanentRedirect } from 'next/navigation';

export default function BooksStorePage() {
  permanentRedirect('/store/books');
}
