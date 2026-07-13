begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users(id,email,raw_user_meta_data) values
 ('30000000-0000-0000-0000-000000000001','m14-member@example.test','{"username":"m14_member"}'),
 ('30000000-0000-0000-0000-000000000002','m14-creator@example.test','{"username":"m14_creator"}'),
 ('30000000-0000-0000-0000-000000000003','m14-other@example.test','{"username":"m14_other"}');
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='creator' where id='30000000-0000-0000-0000-000000000002';
update public.profiles set role='creator' where id='30000000-0000-0000-0000-000000000003';
insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type)
values('40000000-0000-0000-0000-000000000001','m14-link-item','M14 Link Item','M14 Creator','album',0,true,false,'{}','published','30000000-0000-0000-0000-000000000002','music','digital');

set local role anon;
select is((select count(*)::integer from public.external_link_platforms),7,'approved platform catalog is publicly readable');
select throws_ok($$select public.replace_own_profile_external_links('[]'::jsonb)$$,'42501',null,'anonymous users cannot mutate profile links');
select throws_ok($$select public.replace_owned_item_external_links('40000000-0000-0000-0000-000000000001','[]'::jsonb)$$,'42501',null,'anonymous users cannot mutate Item links');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.replace_own_profile_external_links('[{"platform":"spotify","url":"https://open.spotify.com/artist/member"}]'::jsonb)$$,'42501','Creator approval is required to manage creator links.','regular members cannot manage creator links');
select throws_ok($$insert into public.profile_external_links(profile_id,platform,label,url) values('30000000-0000-0000-0000-000000000001','website','Website','https://example.com')$$,'42501',null,'direct authenticated link inserts are revoked');

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.replace_own_profile_external_links('[{"platform":"spotify","url":"https://open.spotify.com/artist/creator"},{"platform":"apple_music","url":"https://music.apple.com/us/artist/creator/1"},{"platform":"bandcamp","url":"https://creator.bandcamp.com"},{"platform":"youtube","url":"https://www.youtube.com/@creator"},{"platform":"instagram","url":"https://www.instagram.com/creator"},{"platform":"x","url":"https://x.com/creator"},{"platform":"website","url":"https://creator.example.com"}]'::jsonb)$$,'approved creators can atomically save every approved profile platform');
select is((select label from public.profile_external_links where profile_id='30000000-0000-0000-0000-000000000002' and platform='spotify'),'Spotify','platform labels are server canonical');
select is((select array_agg(platform order by sort_order) from public.profile_external_links where profile_id='30000000-0000-0000-0000-000000000002'),array['spotify','apple_music','bandcamp','youtube','instagram','x','website']::text[],'all profile platforms retain approved ordering with Website last');
select throws_ok($$select public.replace_own_profile_external_links('[{"platform":"spotify","url":"https://evil.example/artist/creator"}]'::jsonb)$$,'23514','Use a valid HTTPS link for spotify.','official platform hosts are enforced');
select is((select count(*)::integer from public.profile_external_links where profile_id='30000000-0000-0000-0000-000000000002'),7,'failed replacement is atomic and preserves prior profile links');
select throws_ok($$select public.replace_own_profile_external_links('[{"platform":"spotify","url":"https://open.spotify.com/a"},{"platform":"spotify","url":"https://open.spotify.com/b"}]'::jsonb)$$,'23505','Each profile platform can appear once.','duplicate profile platforms are rejected');
select lives_ok($$select public.replace_own_profile_external_links('[{"platform":"bandcamp","url":"https://creator.bandcamp.com"}]'::jsonb)$$,'profile links can be reordered and removed');
select is((select count(*)::integer from public.profile_external_links where profile_id='30000000-0000-0000-0000-000000000002'),1,'removed profile links are deleted by the atomic sync');

select lives_ok($$select public.replace_owned_item_external_links('40000000-0000-0000-0000-000000000001','[{"platform":"spotify","url":"https://open.spotify.com/album/release"},{"platform":"apple_music","url":"https://music.apple.com/us/album/release/1"},{"platform":"bandcamp","url":"https://creator.bandcamp.com/album/release"},{"platform":"youtube","url":"https://www.youtube.com/watch?v=release"}]'::jsonb)$$,'Item owners can save all approved release platforms');
select is((select array_agg(label order by sort_order) from public.item_external_links where item_id='40000000-0000-0000-0000-000000000001'),array['Spotify','Apple Music','Bandcamp','YouTube']::text[],'release links retain canonical labels and order');
select throws_ok($$select public.replace_owned_item_external_links('40000000-0000-0000-0000-000000000001','[{"platform":"instagram","url":"https://instagram.com/release"}]'::jsonb)$$,'23514','Use a valid HTTPS link for instagram.','profile-only platforms are rejected for Items');

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.replace_owned_item_external_links('40000000-0000-0000-0000-000000000001','[]'::jsonb)$$,'42501','Item not found or not editable by this account.','other creators cannot alter release links');

select * from finish();
rollback;
