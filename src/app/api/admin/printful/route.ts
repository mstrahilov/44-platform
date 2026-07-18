import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import {
  listPrintfulCatalogProducts,
  publishPrintfulProduct,
  printfulConfigurationPresence,
  printfulErrorResponse,
  reviewPrintfulProduct,
  syncPrintfulCatalog,
  verifyPrintfulConnection,
} from '@/lib/server/printful';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request) {
  const user = await authenticateCommerceRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  return profile.data?.role === 'admin' ? { admin, user } : null;
}

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const [controls, products, variants, images, drafts, physicalLines, merchItems] = await Promise.all([
      access.admin.from('printful_runtime_controls' as never).select('*').eq('singleton', true).single(),
      access.admin.from('printful_product_mappings' as never).select('id,item_id,store_id,sync_product_id,provider_name,status,last_synced_at,reviewed_at').order('created_at'),
      access.admin.from('printful_variant_mappings' as never).select('id,product_mapping_id,merch_variant_id,sync_variant_id,catalog_variant_id,provider_name,size_value,color_value,availability_status,provider_cost_cents,provider_currency,status,last_synced_at').order('created_at'),
      access.admin.from('merch_product_images' as never)
        .select('id,item_id,role,color_value,title,file_url,sort_order,is_featured,content_sha256,content_type,byte_size,original_filename,created_at')
        .order('sort_order').order('created_at'),
      access.admin.from('printful_fulfillment_orders' as never)
        .select('id,commerce_order_id,provider_order_id,provider_status,provider_dashboard_url,charged_cents,created_at,updated_at')
        .order('created_at', { ascending: false }).limit(20),
      access.admin.from('commerce_order_items')
        .select('id,order_id,item_id,item_title,quantity,merch_variant_id,fulfillment_status')
        .eq('offer_type', 'physical_purchase').order('created_at', { ascending: false }).limit(100),
      access.admin.from('catalog_items')
        .select('id,title,status,price_cents')
        .eq('experience_type', 'merch')
        .in('fulfillment_type', ['physical', 'hybrid'])
        .order('sort_order').order('title'),
    ]);
    if (controls.error) throw controls.error;
    if (products.error) throw products.error;
    if (variants.error) throw variants.error;
    if (images.error) throw images.error;
    if (drafts.error) throw drafts.error;
    if (physicalLines.error) throw physicalLines.error;
    if (merchItems.error) throw merchItems.error;
    const productRows = (products.data ?? []) as unknown as Array<{ id: string; item_id: string } & Record<string, unknown>>;
    const itemPricing = productRows.length
      ? await access.admin.from('catalog_items').select('id,price_cents,status').in('id', productRows.map(product => product.item_id))
      : { data: [], error: null };
    if (itemPricing.error) throw itemPricing.error;
    const retailByItem = new Map((itemPricing.data ?? []).map(item => [item.id, item.price_cents]));
    const statusByItem = new Map((itemPricing.data ?? []).map(item => [item.id, item.status]));
    const variantRows = (variants.data ?? []) as unknown as Array<{ id: string; product_mapping_id: string; merch_variant_id: string; provider_cost_cents: number | null } & Record<string, unknown>>;
    const variantPricing = variantRows.length
      ? await access.admin.from('merch_variants' as never).select('id,price_cents').in('id', variantRows.map(variant => variant.merch_variant_id))
      : { data: [], error: null };
    if (variantPricing.error) throw variantPricing.error;
    const retailByVariant = new Map(((variantPricing.data ?? []) as unknown as Array<{ id: string; price_cents: number | null }>)
      .map(variant => [variant.id, variant.price_cents]));
    const variantsWithPricing = variantRows.map(variant => {
      const retailPriceCents = retailByVariant.get(variant.merch_variant_id) ?? null;
      return {
        ...variant,
        retail_price_cents: retailPriceCents,
        margin_cents: retailPriceCents === null || variant.provider_cost_cents === null
          ? null
          : retailPriceCents - variant.provider_cost_cents,
      };
    });
    const productsWithPricing = productRows.map(product => ({
      ...product,
      retail_price_cents: retailByItem.get(product.item_id) ?? null,
      item_status: statusByItem.get(product.item_id) ?? 'archived',
      maximum_provider_cost_cents: Math.max(
        0,
        ...variantRows.filter(variant => variant.product_mapping_id === product.id)
          .map(variant => variant.provider_cost_cents ?? 0),
      ),
    }));
    const orderIds = [...new Set((physicalLines.data ?? []).map(line => line.order_id))];
    const [orders, addresses] = orderIds.length ? await Promise.all([
      access.admin.from('commerce_orders')
        .select('id,status,currency,total_cents,tax_cents,shipping_cents,paid_at,created_at')
        .in('id', orderIds).in('status', ['paid', 'partially_refunded', 'fulfilled'])
        .order('created_at', { ascending: false }),
      access.admin.from('commerce_order_addresses')
        .select('order_id,recipient_name,address_line_1,address_line_2,city,region,postal_code,country_code')
        .in('order_id', orderIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (orders.error) throw orders.error;
    if (addresses.error) throw addresses.error;
    const addressByOrder = new Map((addresses.data ?? []).map(address => [address.order_id, address]));
    const fulfillmentByOrder = new Map(((drafts.data ?? []) as unknown as Array<{ commerce_order_id: string }>).map(draft => [draft.commerce_order_id, draft]));
    const paidOrders = (orders.data ?? []).map(order => ({
      ...order,
      address: addressByOrder.get(order.id) ?? null,
      lines: (physicalLines.data ?? []).filter(line => line.order_id === order.id),
      fulfillment: fulfillmentByOrder.get(order.id) ?? null,
    }));
    let providerCatalog: Awaited<ReturnType<typeof listPrintfulCatalogProducts>> = [];
    let providerCatalogError: string | null = null;
    const controlRow = controls.data as unknown as { provider_connected?: boolean } | null;
    if (controlRow?.provider_connected) {
      try { providerCatalog = await listPrintfulCatalogProducts(); }
      catch { providerCatalogError = 'Printful catalog could not be refreshed. Existing mappings remain unchanged.'; }
    }
    return Response.json({
      environment: printfulConfigurationPresence(),
      controls: controls.data,
      products: productsWithPricing,
      variants: variantsWithPricing,
      images: images.data ?? [],
      drafts: drafts.data ?? [],
      paidOrders,
      merchItems: merchItems.data ?? [],
      providerCatalog,
      providerCatalogError,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return printfulErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as {
      action?: string;
      itemId?: string;
      syncProductId?: number;
    };
    if (body.action === 'verify_connection') {
      const provider = await verifyPrintfulConnection();
      const updated = await access.admin.from('printful_runtime_controls' as never).update({
        store_id: provider.storeId,
        provider_connected: true,
        catalog_import_enabled: true,
        shipping_quotes_enabled: true,
        draft_orders_enabled: true,
        confirmation_enabled: false,
        verified_at: new Date().toISOString(),
        approved_by: access.user.id,
      } as never).eq('singleton', true);
      if (updated.error) throw updated.error;
      return Response.json({ connected: true, storeId: provider.storeId, confirmationEnabled: false });
    }
    if (body.action === 'sync_catalog') {
      return Response.json(await syncPrintfulCatalog(access.user.id));
    }
    if (body.action === 'review_product') {
      if (!body.itemId) return Response.json({ error: 'Choose an imported 44 Item.', code: 'invalid_request' }, { status: 400 });
      return Response.json(await reviewPrintfulProduct(body.itemId, access.user.id));
    }
    if (body.action === 'publish_product') {
      if (!body.itemId) return Response.json({ error: 'Choose an imported 44 Item.', code: 'invalid_request' }, { status: 400 });
      return Response.json(await publishPrintfulProduct(body.itemId, access.user.id));
    }
    return Response.json({ error: 'Printful Admin action is invalid.', code: 'invalid_request' }, { status: 400 });
  } catch (error) {
    return printfulErrorResponse(error);
  }
}
