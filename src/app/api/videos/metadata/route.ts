import { NextResponse } from 'next/server';

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get('videoId')?.trim() ?? '';
  if (!YOUTUBE_VIDEO_ID.test(videoId)) {
    return NextResponse.json({ title: null }, { status: 400 });
  }

  const oEmbed = new URL('https://www.youtube.com/oembed');
  oEmbed.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  oEmbed.searchParams.set('format', 'json');

  try {
    const response = await fetch(oEmbed, { next: { revalidate: 86_400 } });
    if (!response.ok) return NextResponse.json({ title: null }, { status: 200 });
    const payload = await response.json() as { title?: unknown };
    return NextResponse.json({ title: typeof payload.title === 'string' ? payload.title : null }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json({ title: null }, { status: 200 });
  }
}
