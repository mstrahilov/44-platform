-- Supports account deletion (required for App Store review, Guideline
-- 5.1.1(v)). A plain member with no restricted history can be hard-deleted
-- immediately; a creator/seller/admin whose rows are protected by ON DELETE
-- RESTRICT foreign keys (payout, order, and moderation records) instead gets
-- this timestamp set while their profile is anonymized and login disabled,
-- pending a manual cleanup pass that can safely remove the row without
-- corrupting other members' payout or order history.
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;
