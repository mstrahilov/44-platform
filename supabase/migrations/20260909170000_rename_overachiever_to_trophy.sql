-- Rename the "Overachiever" achievement's display title to "Trophy" —
-- code stays 'overachiever' everywhere (trigger logic, reward wiring,
-- client identifiers all key off the code, not the title).

update public.item_achievements
set title = 'Trophy'
where code = 'overachiever';
