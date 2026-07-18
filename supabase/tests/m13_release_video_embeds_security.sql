begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id,email,raw_user_meta_data) values
 ('e3000000-0000-0000-0000-000000000001','m13-video-creator@example.test','{"username":"m13_video_creator"}'),
 ('e3000000-0000-0000-0000-000000000002','m13-video-member@example.test','{"username":"m13_video_member"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='e3000000-0000-0000-0000-000000000001';
insert into public.catalog_items(id,slug,title,creator,item_type,status,author_id,experience_type)
values
 ('e4000000-0000-0000-0000-000000000001','m13-video-music','Video Music','Video Creator','album','draft','e3000000-0000-0000-0000-000000000001','music'),
 ('e4000000-0000-0000-0000-000000000002','m13-video-asset','Video Asset','Video Creator','asset','draft','e3000000-0000-0000-0000-000000000001','asset'),
 ('e4000000-0000-0000-0000-000000000003','m13-video-public','Public Video Music','Video Creator','album','published','e3000000-0000-0000-0000-000000000001','music');

select is(public.youtube_video_id_from_url('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'dQw4w9WgXcQ','canonical watch URL yields the video ID');
select is(public.youtube_video_id_from_url('https://youtu.be/dQw4w9WgXcQ?t=10'),'dQw4w9WgXcQ','short YouTube URL yields the video ID');
select is(public.youtube_video_id_from_url('http://youtube.com/watch?v=dQw4w9WgXcQ'),null,'non-HTTPS URLs are rejected');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select is((select count(*) from public.item_video_embeds where item_id='e4000000-0000-0000-0000-000000000001'),0::bigint,'anonymous users cannot see draft release embeds');
select throws_ok($$insert into public.item_video_embeds(item_id,title,youtube_video_id) values ('e4000000-0000-0000-0000-000000000001','Trailer','dQw4w9WgXcQ')$$,'42501',null,'anonymous users cannot write embeds');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e3000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000001','[{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"},{"url":"https://youtu.be/9bZkp7q19f0"}]'::jsonb)$$,'creator can replace owned release embeds using URLs only');
select is((select count(*) from public.item_video_embeds where item_id='e4000000-0000-0000-0000-000000000001'),2::bigint,'two URL-only embeds are stored');
select is((select title from public.item_video_embeds where item_id='e4000000-0000-0000-0000-000000000001' order by sort_order limit 1),'YouTube video 1','URL-only embeds receive a stable internal title');
select lives_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000001','[{"url":"https://youtu.be/AAAAAAAAAA1"},{"url":"https://youtu.be/AAAAAAAAAA2"},{"url":"https://youtu.be/AAAAAAAAAA3"},{"url":"https://youtu.be/AAAAAAAAAA4"},{"url":"https://youtu.be/AAAAAAAAAA5"},{"url":"https://youtu.be/AAAAAAAAAA6"},{"url":"https://youtu.be/AAAAAAAAAA7"},{"url":"https://youtu.be/AAAAAAAAAA8"},{"url":"https://youtu.be/AAAAAAAAAA9"},{"url":"https://youtu.be/AAAAAAAAAA0"}]'::jsonb)$$,'creator can configure ten release videos');
select throws_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000001','[{"url":"https://youtu.be/AAAAAAAAAA1"},{"url":"https://youtu.be/AAAAAAAAAA2"},{"url":"https://youtu.be/AAAAAAAAAA3"},{"url":"https://youtu.be/AAAAAAAAAA4"},{"url":"https://youtu.be/AAAAAAAAAA5"},{"url":"https://youtu.be/AAAAAAAAAA6"},{"url":"https://youtu.be/AAAAAAAAAA7"},{"url":"https://youtu.be/AAAAAAAAAA8"},{"url":"https://youtu.be/AAAAAAAAAA9"},{"url":"https://youtu.be/AAAAAAAAAA0"},{"url":"https://youtu.be/BBBBBBBBBB1"}]'::jsonb)$$,'22023',null,'an eleventh release video is rejected');
select throws_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000001','[{"title":"Bad","url":"https://evil.example/video"}]'::jsonb)$$,'22023',null,'non-YouTube URLs are rejected');
select throws_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000002','[{"title":"Bad","url":"https://youtu.be/dQw4w9WgXcQ"}]'::jsonb)$$,'22023',null,'unsupported Item experiences cannot receive embeds');

select set_config('request.jwt.claim.sub','e3000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.replace_owned_item_video_embeds('e4000000-0000-0000-0000-000000000001','[]'::jsonb)$$,'42501',null,'non-owners cannot replace embeds');

select is((select count(*) from public.item_video_embeds where item_id='e4000000-0000-0000-0000-000000000003'),0::bigint,'published Items begin without invented embed data');
select * from finish();
rollback;
