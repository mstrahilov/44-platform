import type { Instrumentation } from 'next';

function normalizedError(error: unknown) {
  if (error instanceof Error) {
    const digest = 'digest' in error && typeof error.digest === 'string' ? error.digest : undefined;
    return { name: error.name, message: error.message, digest };
  }
  return { name: 'UnknownError', message: 'A non-Error value was thrown.' };
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const event = {
    event: 'request_error',
    occurredAt: new Date().toISOString(),
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_RELEASE || 'development',
    runtime: process.env.NEXT_RUNTIME || 'nodejs',
    request: { method: request.method, path: request.path },
    context,
    error: normalizedError(error),
  };

  // JSON output is intentionally free of headers, query values, user content, and tokens.
  // Vercel captures it today; a reviewed monitoring provider can consume the same contract later.
  console.error(JSON.stringify(event));
};
