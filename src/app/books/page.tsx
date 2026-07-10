import { permanentRedirect } from 'next/navigation';

export default function BooksRedirect() {
  permanentRedirect('/store/books');
}
