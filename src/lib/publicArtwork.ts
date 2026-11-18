const uploadBucket = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? 'uploads';
export const publicArtworkPath = `/storage/v1/object/public/${uploadBucket}/`;

export function getPublicArtworkOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function isOptimizablePublicArtwork(src: string) {
  const origin = getPublicArtworkOrigin();
  if (!origin) return false;

  try {
    const url = new URL(src);
    return url.origin === origin.origin
      && url.pathname.startsWith(publicArtworkPath)
      && !url.search && !url.hash && !url.username && !url.password
      && /\.(?:jpe?g|png|webp|avif)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
