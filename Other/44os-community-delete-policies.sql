-- 44OS Community owner delete policies
-- Review and run in Supabase SQL editor after backing up the project.

drop policy if exists "community questions owner delete" on public.community_questions;
create policy "community questions owner delete"
on public.community_questions
for delete
using (author_id = auth.uid());

drop policy if exists "community question answers owner delete" on public.community_question_answers;
create policy "community question answers owner delete"
on public.community_question_answers
for delete
using (author_id = auth.uid());

drop policy if exists "community collaborations owner delete" on public.community_collaborations;
create policy "community collaborations owner delete"
on public.community_collaborations
for delete
using (author_id = auth.uid());

drop policy if exists "community collaboration responses owner delete" on public.community_collaboration_responses;
create policy "community collaboration responses owner delete"
on public.community_collaboration_responses
for delete
using (author_id = auth.uid());

notify pgrst, 'reload schema';
