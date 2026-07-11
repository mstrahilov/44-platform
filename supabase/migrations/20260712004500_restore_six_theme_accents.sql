-- Keep the focused six-accent 44OS palette.

update public.user_theme_preferences
set theme_accent = 'ocean', updated_at = now()
where theme_accent in ('yin', 'yang');

alter table public.user_theme_preferences
  drop constraint if exists user_theme_preferences_theme_accent_check;

alter table public.user_theme_preferences
  add constraint user_theme_preferences_theme_accent_check
  check (theme_accent = any (array[
    'amber'::text,
    'sage'::text,
    'ocean'::text,
    'violet'::text,
    'red'::text,
    'cyan'::text
  ]));
