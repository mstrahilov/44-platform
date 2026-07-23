import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  const segments = (await context.params).path;
  const root = path.resolve(process.cwd(), 'Other/MASK');
  const target = path.resolve(root, ...segments);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return new NextResponse(null, { status: 404 });

  try {
    const body = await readFile(target);
    const gzip = target.endsWith('.gz');
    const extension = path.extname(gzip ? target.slice(0, -3) : target);
    return new NextResponse(body, {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
        ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
        'Cache-Control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
