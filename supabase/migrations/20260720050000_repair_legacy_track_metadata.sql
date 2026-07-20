begin;

-- Repair three known legacy rows without weakening the creator-managed track
-- boundary. Every change is guarded by the immutable track ID and the exact
-- value observed during the production inventory. If a creator or administrator
-- changes one of these rows before deployment, the migration stops for review
-- instead of overwriting newer work.
do $$
declare
  current_audio_url text;
  current_duration integer;
begin
  if exists(select 1 from public.tracks where id = '62277a2a-f9cf-4e3b-9a29-09deb03bb512') then
    select audio_url into current_audio_url
    from public.tracks
    where id = '62277a2a-f9cf-4e3b-9a29-09deb03bb512'
      and title = 'touch (feat. Kholor)'
    for update;

    if current_audio_url is null then
      raise exception 'The guarded touch (feat. Kholor) track metadata changed after inventory.';
    end if;
    if current_audio_url not in (
      'https://xruhewziwbvdbwzvjohh.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783006193303-olsten-touch-feat-kholor.mp3',
      'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783191107348-01-touch-feat.-kholor-.mp3'
    ) then
      raise exception 'touch (feat. Kholor) changed after inventory; refusing to overwrite it.';
    end if;

    update public.tracks
    set audio_url = 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783191107348-01-touch-feat.-kholor-.mp3'
    where id = '62277a2a-f9cf-4e3b-9a29-09deb03bb512';
  end if;

  if exists(select 1 from public.tracks where id = 'ad7f8882-b3e2-55ab-8359-d11fedb83f42') then
    select audio_url into current_audio_url
    from public.tracks
    where id = 'ad7f8882-b3e2-55ab-8359-d11fedb83f42'
      and title = 'Where You At?'
    for update;

    if current_audio_url is null then
      raise exception 'The guarded Where You At? track metadata changed after inventory.';
    end if;
    if current_audio_url not in (
      'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07.%20Where%20You%20At%3F.mp3',
      'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07.%20Where%20You%20At'
    ) then
      raise exception 'Where You At? changed after inventory; refusing to overwrite it.';
    end if;

    update public.tracks
    set audio_url = 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07.%20Where%20You%20At'
    where id = 'ad7f8882-b3e2-55ab-8359-d11fedb83f42';
  end if;

  if exists(select 1 from public.tracks where id = '0025cb74-5e4b-4f36-9dc6-fea8f09759ba') then
    select duration_seconds into current_duration
    from public.tracks
    where id = '0025cb74-5e4b-4f36-9dc6-fea8f09759ba'
      and title = 'GET OUT'
    for update;

    if not found then
      raise exception 'The guarded GET OUT track metadata changed after inventory.';
    end if;
    if current_duration is not null and current_duration <> 155 then
      raise exception 'GET OUT duration changed after inventory; refusing to overwrite it.';
    end if;

    update public.tracks
    set duration_seconds = 155
    where id = '0025cb74-5e4b-4f36-9dc6-fea8f09759ba';
  end if;

  -- Keep creator-submission snapshots from restoring repaired legacy metadata
  -- if an existing release is edited and approved later.
  update public.item_submission_tracks
  set audio_url = 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783191107348-01-touch-feat.-kholor-.mp3'
  where source_id = '62277a2a-f9cf-4e3b-9a29-09deb03bb512'
    and audio_url = 'https://xruhewziwbvdbwzvjohh.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783006193303-olsten-touch-feat-kholor.mp3';

  update public.item_submission_tracks
  set audio_url = 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07.%20Where%20You%20At'
  where source_id = 'ad7f8882-b3e2-55ab-8359-d11fedb83f42'
    and audio_url = 'https://rgxhjkvkjwgabsprgftb.supabase.co/storage/v1/object/public/uploads/tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07.%20Where%20You%20At%3F.mp3';

  update public.item_submission_tracks
  set duration_seconds = 155
  where source_id = '0025cb74-5e4b-4f36-9dc6-fea8f09759ba'
    and duration_seconds is null;
end;
$$;

commit;
