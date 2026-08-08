import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { localDesktopArtifacts, type LocalDesktopPlatform } from '@/lib/desktopArtifacts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requestedArtifact(context: { params: Promise<{ platform: string }> }) {
  const { platform } = await context.params;
  return platform in localDesktopArtifacts
    ? localDesktopArtifacts[platform as LocalDesktopPlatform]
    : null;
}

export async function HEAD(_request: NextRequest, context: { params: Promise<{ platform: string }> }) {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });
  const artifact = await requestedArtifact(context);
  if (!artifact) return new NextResponse(null, { status: 404 });

  try {
    const file = await stat(path.join(process.cwd(), artifact.relativePath));
    if (!file.isFile()) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Length': String(file.size),
        'Content-Type': artifact.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ platform: string }> }) {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });
  const artifact = await requestedArtifact(context);
  if (!artifact) return new NextResponse(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), artifact.relativePath));
    return new NextResponse(bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Content-Length': String(bytes.byteLength),
        'Content-Type': artifact.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: `The local ${artifact.label} installer has not been imported yet.` }, { status: 404 });
  }
}
