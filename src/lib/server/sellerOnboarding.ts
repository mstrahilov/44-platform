import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import {
  authenticateCommerceRequest,
  checkoutSiteUrl,
  commerceAdminClient,
  CommerceAuthenticationError,
  CommerceConfigurationError,
} from '@/lib/server/commerce';

const MAX_TAX_PDF_BYTES = 5 * 1024 * 1024;

type EncryptedValue = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  digest: string;
  keyVersion: number;
};

export class SellerOnboardingError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function encryptionKey() {
  const encoded = process.env.SELLER_PRIVATE_DATA_ENCRYPTION_KEY?.trim();
  const version = Number(process.env.SELLER_PRIVATE_DATA_ENCRYPTION_KEY_VERSION ?? '1');
  if (!encoded || !Number.isInteger(version) || version < 1) {
    throw new CommerceConfigurationError('Private seller onboarding storage is not configured.');
  }
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new CommerceConfigurationError('Private seller onboarding storage is not configured.');
  }
  return { key, version };
}

function encryptPrivateValue(value: Buffer): EncryptedValue {
  const { key, version } = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    digest: createHash('sha256').update(value).digest('hex'),
    keyVersion: version,
  };
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin !== checkoutSiteUrl()) {
    throw new SellerOnboardingError('invalid_origin', 'Seller setup request origin is invalid.', 403);
  }
}

export async function authenticateSellerRequest(request: Request): Promise<User> {
  assertSameOrigin(request);
  const user = await authenticateCommerceRequest(request);
  const profile = await commerceAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'creator') {
    throw new SellerOnboardingError('creator_required', 'Creator access is required.', 403);
  }
  return user;
}

export async function sellerOnboardingState(userId: string) {
  const result = await commerceAdminClient().rpc('get_creator_seller_onboarding_state' as never, {
    target_creator_id: userId,
  } as never);
  if (result.error) throw result.error;
  return result.data;
}

export async function classifySellerWithToken(
  request: Request,
  input: { sellerType?: string; usPersonStatus?: string; specialCase?: string },
) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new CommerceAuthenticationError();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new CommerceConfigurationError('Seller onboarding is not configured.');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await client.rpc('begin_creator_seller_onboarding' as never, {
    target_seller_type: input.sellerType,
    target_us_person_status: input.usPersonStatus,
    target_special_case: input.specialCase ?? 'none',
  } as never);
  if (result.error) throw result.error;
  return result.data;
}

export async function storeSignedTaxForm(userId: string, formData: FormData) {
  const formType = String(formData.get('formType') ?? '').toLowerCase();
  const signatureConfirmed = formData.get('signatureConfirmed') === 'true';
  const signedAtText = String(formData.get('signedAt') ?? '');
  const file = formData.get('file');
  if (!['w9', 'w8ben'].includes(formType) || !signatureConfirmed || !(file instanceof File)) {
    throw new SellerOnboardingError('invalid_tax_form', 'A completed and signed official tax form is required.');
  }
  if (file.type !== 'application/pdf' || file.size < 1 || file.size > MAX_TAX_PDF_BYTES) {
    throw new SellerOnboardingError('invalid_tax_pdf', 'Upload one signed PDF no larger than 5 MB.');
  }
  const signedAt = new Date(signedAtText);
  if (!Number.isFinite(signedAt.getTime()) || signedAt.getTime() > Date.now() + 5 * 60_000) {
    throw new SellerOnboardingError('invalid_signature_date', 'Enter the date the form was signed.');
  }
  const pdf = Buffer.from(await file.arrayBuffer());
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new SellerOnboardingError('invalid_tax_pdf', 'The uploaded file must be a PDF.');
  }
  const encrypted = encryptPrivateValue(pdf);
  const expiresAt = formType === 'w8ben'
    ? new Date(Date.UTC(signedAt.getUTCFullYear() + 3, 11, 31, 23, 59, 59, 999)).toISOString()
    : null;
  const result = await commerceAdminClient().rpc('store_creator_tax_document' as never, {
    target_creator_id: userId,
    target_form_type: formType,
    target_form_revision: formType === 'w9' ? '2024-03' : '2021-10',
    target_digest: encrypted.digest,
    target_signed_at: signedAt.toISOString(),
    target_expires_at: expiresAt,
    target_ciphertext: `\\x${encrypted.ciphertext.toString('hex')}`,
    target_iv: `\\x${encrypted.iv.toString('hex')}`,
    target_auth_tag: `\\x${encrypted.authTag.toString('hex')}`,
    target_key_version: encrypted.keyVersion,
    target_byte_length: pdf.length,
  } as never);
  if (result.error) throw result.error;
  return { status: 'pending_review', formType, revision: formType === 'w9' ? '2024-03' : '2021-10' };
}

function normalizePayoutEmail(value: string) {
  const normalized = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 320) {
    throw new SellerOnboardingError('invalid_payout_email', 'Enter the email address that should receive the Wise claim.');
  }
  const [local, domain] = normalized.toLowerCase().split('@');
  const maskedLocal = local.length <= 2
    ? `${local[0] ?? '*'}*`
    : `${local.slice(0, 2)}${'*'.repeat(Math.min(6, local.length - 2))}`;
  return { privateValue: normalized.toLowerCase(), masked: `${maskedLocal}@${domain}` };
}

export async function storePayoutDestination(
  user: User,
  input: { email?: string; routeId?: string },
) {
  const currentState = await sellerOnboardingState(user.id) as {
    destination_status?: string | null;
  };
  if (currentState?.destination_status) {
    const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if (!lastSignInAt || Date.now() - lastSignInAt > 5 * 60_000) {
      throw new SellerOnboardingError(
        'reauthentication_required',
        'Sign in again before replacing your payout email.',
        401,
      );
    }
  }
  const routeId = String(input.routeId ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeId)) {
    throw new SellerOnboardingError('invalid_payout_route', 'The verified Wise payout route is missing or expired.');
  }
  const destination = normalizePayoutEmail(String(input.email ?? ''));
  const encrypted = encryptPrivateValue(Buffer.from(destination.privateValue, 'utf8'));
  const result = await commerceAdminClient().rpc('store_creator_payout_destination' as never, {
    target_creator_id: user.id,
    target_route_id: routeId,
    target_masked_display: destination.masked,
    target_digest: encrypted.digest,
    target_ciphertext: `\\x${encrypted.ciphertext.toString('hex')}`,
    target_iv: `\\x${encrypted.iv.toString('hex')}`,
    target_auth_tag: `\\x${encrypted.authTag.toString('hex')}`,
    target_key_version: encrypted.keyVersion,
  } as never);
  if (result.error) throw result.error;
  return { status: 'verified', type: 'email_claim', masked: destination.masked };
}

export function sellerErrorResponse(error: unknown) {
  const known = error instanceof SellerOnboardingError
    || error instanceof CommerceAuthenticationError
    || error instanceof CommerceConfigurationError;
  return Response.json({
    error: known ? error.message : 'Creator setup could not be saved.',
    code: known && 'code' in error ? error.code : 'seller_setup_failed',
  }, {
    status: known && 'status' in error ? error.status : 400,
    headers: { 'Cache-Control': 'no-store' },
  });
}
