-- One-off repair for the Touch test track uploaded on 2026-07-02.
-- This attaches the uploaded MP3 in Storage to the existing tracks row.

update public.tracks
set audio_url = 'https://xruhewziwbvdbwzvjohh.supabase.co/storage/v1/object/public/uploads/tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783006193303-olsten-touch-feat-kholor.mp3'
where id = '62277a2a-f9cf-4e3b-9a29-09deb03bb512'
  and product_id = '55ac2175-ed52-4ae4-bbe8-d69c010ef75c';
