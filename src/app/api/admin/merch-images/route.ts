import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const IMAGE_ROLES = new Set(['main', 'color', 'bonus']);
const UPLOAD_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET?.trim() || 'uploads';

async function requireAdmin(request: Request) {
  const user = await authenticateCommerceRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  return profile.data?.role === 'admin' ? { admin, user } : null;
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'product-image';
}

function imageError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Merch image operation failed.';
  return Response.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    const access = await requireAdmin(request);
    if (!access) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const form = await request.formData();
    const file = form.get('file');
    const itemId = String(form.get('itemId') ?? '').trim();
    const role = String(form.get('role') ?? '').trim();
    const requestedColor = String(form.get('colorValue') ?? '').trim();
    const requestedTitle = String(form.get('title') ?? '').trim();
    if (!(file instanceof File) || !itemId || !IMAGE_ROLES.has(role)) {
      return Response.json({ error: 'Choose an exact product, image role, and file.' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: 'Use a PNG, JPEG, WebP, or AVIF image no larger than 12 MB.' }, { status: 400 });
    }
    const item = await access.admin.from('catalog_items')
      .select('id,title,experience_type,fulfillment_type')
      .eq('id', itemId).maybeSingle();
    if (item.error) throw item.error;
    if (!item.data || item.data.experience_type !== 'merch' || !['physical', 'hybrid'].includes(item.data.fulfillment_type ?? '')) {
      return Response.json({ error: 'Images can be assigned only to a physical 44OS Merch Item.' }, { status: 400 });
    }

    let colorValue: string | null = null;
    if (role === 'color') {
      if (!requestedColor) return Response.json({ error: 'Choose an imported product color.' }, { status: 400 });
      const variants = await access.admin.from('merch_variants' as never)
        .select('option_values').eq('item_id', itemId);
      if (variants.error) throw variants.error;
      const exactColor = ((variants.data ?? []) as unknown as Array<{ option_values: Record<string, unknown> }>)
        .map(variant => variant.option_values?.color)
        .find(value => typeof value === 'string' && value.trim().toLowerCase() === requestedColor.toLowerCase());
      if (typeof exactColor !== 'string') {
        return Response.json({ error: 'That color is not present in the imported Printful variants.' }, { status: 400 });
      }
      colorValue = exactColor.trim();
    }

    const extension = safeFileName(file.name).split('.').pop() || file.type.split('/')[1] || 'jpg';
    uploadedPath = `merch/${itemId}/${crypto.randomUUID()}.${extension}`;
    const upload = await access.admin.storage.from(UPLOAD_BUCKET).upload(uploadedPath, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (upload.error) throw upload.error;
    const fileUrl = access.admin.storage.from(UPLOAD_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    const title = (requestedTitle || (role === 'main'
      ? `${item.data.title} main image`
      : role === 'color'
        ? `${item.data.title} — ${colorValue}`
        : `${item.data.title} gallery image`)).slice(0, 160);

    const assigned = await access.admin.rpc('set_merch_product_image' as never, {
      target_item_id: itemId,
      target_role: role,
      target_color_value: colorValue,
      target_title: title,
      target_file_url: fileUrl,
      target_storage_path: uploadedPath,
      target_created_by: access.user.id,
    } as never);
    if (assigned.error) throw assigned.error;
    const assignment = assigned.data as unknown as { id: string; replaced_storage_path: string | null };
    if (assignment.replaced_storage_path && assignment.replaced_storage_path !== uploadedPath) {
      await access.admin.storage.from(UPLOAD_BUCKET).remove([assignment.replaced_storage_path]);
    }
    uploadedPath = null;
    return Response.json({ id: assignment.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (uploadedPath) {
      try { await commerceAdminClient().storage.from(UPLOAD_BUCKET).remove([uploadedPath]); } catch { /* orphan cleanup is best effort */ }
    }
    return imageError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as { imageId?: string };
    if (!body.imageId) return Response.json({ error: 'Choose an exact Merch image.' }, { status: 400 });
    const deletion = await access.admin.rpc('delete_merch_product_image' as never, {
      target_image_id: body.imageId,
    } as never);
    if (deletion.error) throw deletion.error;
    const result = deletion.data as unknown as { deleted: boolean; storage_path: string | null };
    if (result.storage_path) await access.admin.storage.from(UPLOAD_BUCKET).remove([result.storage_path]);
    return Response.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return imageError(error);
  }
}
