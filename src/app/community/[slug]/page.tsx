'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyCommunityProfileRedirect() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!slug) return;
    router.replace(`/community/profile/${slug}`);
  }, [router, slug]);

  return <div className="panel-scroll" />;
}
