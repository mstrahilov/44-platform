-- Shorten "No Skips" and "Signal Boost" descriptions so they fit on one
-- line on a phone screen.

update public.item_achievements
set description = 'Listen without skipping a single track.'
where code = 'no_skips';

update public.item_achievements
set description = 'Get someone to open your shared link.'
where code = 'signal_boost';
