import { permanentRedirect } from 'next/navigation';

export default function MusicRedirect() {
  permanentRedirect('/browse/music');
}
