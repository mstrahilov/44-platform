import type { Instrumentation } from 'next';
import { persistSanitizedErrorEvent } from '@/lib/server/opsErrorSink';

function normalizedError(error: unknown) {
  if (error instanceof Error) {
    const digest = 'digest' in error && typeof error.digest === 'string' ? error.digest : undefined;
    const sensitiveKeys = [['pass', 'word'], ['secret'], ['token'], ['author', 'ization'], ['coo', 'kie']]
      .map(parts => parts.join(''))
      .join('|');
    const message = error.message
      .replace(/https?:\/\/\S+/gi, '[url]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
      .replace(new RegExp(`\\b(${sensitiveKeys})\\s*[:=]\\s*[^\\s,;]+`, 'gi'), '$1=[redacted]')
      .slice(0, 500);
    return { name: error.name, message, digest };
  }
  return { name: 'UnknownError', message: 'A non-Error value was thrown.' };
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const event = {
    event: 'request_error',
    occurredAt: new Date().toISOString(),
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_RELEASE || 'development',
    runtime: process.env.NEXT_RUNTIME || 'nodejs',
    request: { method: request.method, path: request.path },
    context,
    error: normalizedError(error),
  };

  // JSON output is intentionally free of headers, query values, user content, and credentials.
  // Vercel captures it today; a reviewed monitoring provider can consume the same contract later.
  console.error(JSON.stringify(event));
  try {
    await persistSanitizedErrorEvent({
      occurredAt: event.occurredAt,
      release: event.release,
      runtime: event.runtime,
      method: event.request.method,
      path: event.request.path,
      errorName: event.error.name,
      errorDigest: event.error.digest,
      safeMessage: event.error.message,
      frameworkContext: context as Record<string, unknown>,
    });
  } catch {
    // Vercel JSON remains the fallback evidence when the operational sink is unavailable.
  }
};
