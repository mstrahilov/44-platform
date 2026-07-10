import { redirect } from 'next/navigation';

export default function LegacyFollowingRedirect() {
  redirect('/community?filter=following');
}
