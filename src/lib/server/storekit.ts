import { createHash } from 'crypto';
import {
  Environment,
  SignedDataVerifier,
  Type,
  VerificationException,
  VerificationStatus,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

const JWS = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const ENVIRONMENTS = new Set<string>(Object.values(Environment));

export class StoreKitConfigurationError extends Error {
  status = 503;
  code = 'storekit_not_configured';
}

export class StoreKitVerificationError extends Error {
  status: number;
  code = 'invalid_storekit_signature';

  constructor(message = 'Apple could not verify the signed purchase.', retryable = false) {
    super(message);
    this.status = retryable ? 503 : 400;
  }
}

function storeKitConfiguration() {
  if (process.env.APPLE_STOREKIT_ENABLED !== 'true') {
    throw new StoreKitConfigurationError('Digital App Store purchases are not activated.');
  }
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim();
  const certificateValues = (process.env.APPLE_ROOT_CERTIFICATES_BASE64 ?? '')
    .split(',')
    .map(value => value.replace(/\s+/g, ''))
    .filter(Boolean);
  const allowedEnvironments = new Set(
    (process.env.APPLE_STOREKIT_ALLOWED_ENVIRONMENTS ?? 'Production,Sandbox')
      .split(',')
      .map(value => value.trim())
      .filter(value => ENVIRONMENTS.has(value)),
  );
  const appAppleIdText = process.env.APPLE_APP_ID?.trim();
  const appAppleId = appAppleIdText && /^\d{1,20}$/.test(appAppleIdText)
    ? Number(appAppleIdText)
    : undefined;
  if (!bundleId || bundleId !== 'com.fortyfour.os44' || certificateValues.length < 1
    || allowedEnvironments.size < 1 || (allowedEnvironments.has(Environment.PRODUCTION) && !appAppleId)) {
    throw new StoreKitConfigurationError('App Store signature verification is incomplete.');
  }
  return {
    bundleId,
    rootCertificates: certificateValues.map(value => Buffer.from(value, 'base64')),
    allowedEnvironments,
    appAppleId,
    onlineChecks: process.env.APPLE_STOREKIT_ONLINE_CHECKS !== 'false',
  };
}

export function assertStoreKitConfigured() {
  storeKitConfiguration();
}

function unverifiedPayload(value: string): Record<string, unknown> {
  if (!JWS.test(value) || value.length > 65_536) throw new StoreKitVerificationError();
  try {
    const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8')) as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid payload');
    return payload as Record<string, unknown>;
  } catch {
    throw new StoreKitVerificationError();
  }
}

function inferredEnvironment(value: string, notification: boolean): Environment {
  const payload = unverifiedPayload(value);
  const candidate = notification
    ? (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>).environment
      : undefined)
    : payload.environment;
  if (typeof candidate !== 'string' || !ENVIRONMENTS.has(candidate)) {
    throw new StoreKitVerificationError('The signed Apple environment is invalid.');
  }
  return candidate as Environment;
}

function verifier(environment: Environment) {
  const configuration = storeKitConfiguration();
  if (!configuration.allowedEnvironments.has(environment)) {
    throw new StoreKitVerificationError('This App Store environment is not enabled.');
  }
  return new SignedDataVerifier(
    configuration.rootCertificates,
    configuration.onlineChecks,
    environment,
    configuration.bundleId,
    environment === Environment.PRODUCTION ? configuration.appAppleId : undefined,
  );
}

function verificationFailure(error: unknown): never {
  const retryable = error instanceof VerificationException
    && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE;
  throw new StoreKitVerificationError(undefined, retryable);
}

export async function verifyStoreKitTransaction(jws: string): Promise<JWSTransactionDecodedPayload> {
  const environment = inferredEnvironment(jws, false);
  try {
    return await verifier(environment).verifyAndDecodeTransaction(jws);
  } catch (error) {
    if (error instanceof StoreKitConfigurationError || error instanceof StoreKitVerificationError) throw error;
    return verificationFailure(error);
  }
}

export async function verifyStoreKitNotification(jws: string): Promise<ResponseBodyV2DecodedPayload> {
  const environment = inferredEnvironment(jws, true);
  try {
    return await verifier(environment).verifyAndDecodeNotification(jws);
  } catch (error) {
    if (error instanceof StoreKitConfigurationError || error instanceof StoreKitVerificationError) throw error;
    return verificationFailure(error);
  }
}

export function assertNonConsumableTransaction(transaction: JWSTransactionDecodedPayload) {
  if (transaction.type !== Type.NON_CONSUMABLE || transaction.quantity !== 1) {
    throw new StoreKitVerificationError('Only one approved non-consumable product may be fulfilled.');
  }
}

export function storeKitDigest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function readStoreKitJSON<T>(request: Request, maximumBytes = 131_072): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new StoreKitVerificationError('The App Store request is too large.');
  }
  const text = await request.text();
  if (!text || Buffer.byteLength(text, 'utf8') > maximumBytes) {
    throw new StoreKitVerificationError('The App Store request is invalid.');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new StoreKitVerificationError('The App Store request is invalid.');
  }
}

export function storeKitErrorResponse(error: unknown) {
  const known = error instanceof StoreKitConfigurationError || error instanceof StoreKitVerificationError;
  return Response.json({
    error: known ? error.message : 'The App Store purchase service is temporarily unavailable.',
    code: known ? error.code : 'storekit_failed',
  }, {
    status: known ? error.status : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
