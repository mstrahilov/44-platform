'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyProfileRedirectPage() {
  const router = useRouter();
  const { username } = useParams<{ username: string }>();

  useEffect(() => {
    if (!username) return;
    router.replace(`/community/profile/${username}`);
  }, [router, username]);

  return <div className="panel-scroll" />;
}
