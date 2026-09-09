-- Simplify to a flat points scheme: 10 points per regular achievement,
-- 25 points for Trophy (code 'overachiever') — replaces the varied point
-- values from the previous migration.

update public.item_achievements
set points = case when code = 'overachiever' then 25 else 10 end;
