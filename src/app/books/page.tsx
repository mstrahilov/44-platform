import { redirect } from 'next/navigation';

export default function BooksRedirect() {
  redirect('/books/store');
}
