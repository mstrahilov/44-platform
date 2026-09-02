-- Free Sample Packs are a supported publishing choice, not an oversight —
-- creators can publish a Sample Pack at no cost. Drop the trigger added by
-- 20260719021000_book_access_and_sample_pack_pricing.sql that rejected
-- publishing any Sample Pack with is_free/price_cents/download_purchase_enabled
-- reflecting a free download.
drop trigger if exists catalog_items_enforce_paid_sample_pack on public.catalog_items;
drop function if exists public.enforce_paid_sample_pack();
