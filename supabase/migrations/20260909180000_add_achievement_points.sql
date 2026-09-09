-- Assign real point values to achievements, powering a new account-wide
-- points/level system in the app (no bronze/silver/gold tiers — one flat
-- point value per achievement code). Trophy (code 'overachiever') awards
-- more than any individual achievement, since it requires completing every
-- other one on that release.

update public.item_achievements set points = 10 where code = 'no_skips';
update public.item_achievements set points = 10 where code = 'nightbird';
update public.item_achievements set points = 15 where code = 'heavy_rotation';
update public.item_achievements set points = 10 where code = 'joined_the_orbit';
update public.item_achievements set points = 15 where code = 'signal_boost';
update public.item_achievements set points = 50 where code = 'overachiever';
