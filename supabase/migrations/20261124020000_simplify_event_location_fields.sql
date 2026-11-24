-- New Event forms use one freeform venue address. Keep legacy complete
-- in-person and hybrid rows valid while allowing the simplified location.
alter table public.creator_events
  drop constraint if exists creator_events_format_fields_check;

alter table public.creator_events
  add constraint creator_events_format_fields_check check (
    (
      format = 'in_person'
      and venue_name is not null
      and online_url is null
    )
    or (
      format = 'online'
      and online_url is not null
      and venue_name is null
      and address_line1 is null
      and address_line2 is null
      and locality is null
      and region is null
      and postal_code is null
      and country_code is null
    )
    or (
      format = 'hybrid'
      and venue_name is not null
      and online_url is not null
    )
  );

comment on constraint creator_events_format_fields_check on public.creator_events is
  'New in-person events use venue_name as a single display-ready venue address; legacy address columns remain supported.';
