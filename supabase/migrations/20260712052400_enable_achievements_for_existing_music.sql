update public.achievement_templates
set description = 'Unlock every other achievement.'
where code = 'overachiever';

update public.item_achievements
set description = 'Unlock every other achievement.'
where code = 'overachiever';

insert into public.item_achievements (
  item_id,
  template_id,
  code,
  title,
  description,
  trigger_type,
  trigger_config,
  reward_config,
  points,
  icon,
  sort_order,
  is_secret
)
select
  item.id,
  template.id,
  template.code,
  template.title,
  template.description,
  template.trigger_type,
  template.trigger_config,
  '{}'::jsonb,
  template.points,
  template.icon,
  template.sort_order,
  template.is_secret
from public.catalog_items item
cross join public.achievement_templates template
where item.experience_type = 'music'
  and template.is_active = true
  and 'music' = any(template.supported_experiences)
on conflict (item_id, code) do nothing;
