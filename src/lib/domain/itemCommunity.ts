import type { Profile } from '@/lib/platform';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type ContentProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url'>;

export type ItemReview = {
  id: string;
  user_id: string;
  item_id: string;
  title: string | null;
  body: string;
  sentiment: string;
  status: string;
  created_at: string;
  reviewers?: ContentProfile | ContentProfile[] | null;
};

export type ItemUpdate = {
  id: string;
  item_id: string;
  author_id: string;
  title: string;
  body: string;
  version_label: string | null;
  status: string;
  created_at: string;
  authors?: ContentProfile | ContentProfile[] | null;
};

export type ItemQuestion = Database['public']['Views']['community_question_content']['Row'];

export async function listItemReviews(itemId: string) {
  const result = await supabase
    .from('community_review_content')
    .select('id,user_id,item_id,title,body,sentiment,status,created_at,reviewers:profiles!user_id(id,slug,username,display_name,avatar_url)')
    .eq('item_id', itemId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as ItemReview[] | null) ?? [];
}

export async function saveItemReview(itemId: string, body: string) {
  const result = await supabase.rpc('upsert_content_review', {
    target_item_id: itemId,
    review_body: body,
    review_title: undefined,
    review_sentiment: 'recommended',
    review_rating: undefined,
  });
  if (result.error) throw result.error;
}

export async function listItemUpdates(itemId: string) {
  const result = await supabase
    .from('community_update_content')
    .select('id,item_id,author_id,title,body,version_label,status,created_at,authors:profiles!author_id(id,slug,username,display_name,avatar_url)')
    .eq('item_id', itemId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as ItemUpdate[] | null) ?? [];
}

export async function createItemUpdate(itemId: string, title: string, body: string, versionLabel?: string) {
  const result = await supabase.rpc('create_content_update', {
    target_item_id: itemId,
    update_title: title.trim(),
    update_body: body.trim(),
    update_version_label: versionLabel?.trim() || undefined,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function listItemQuestions(itemId: string) {
  const result = await supabase
    .from('community_question_content')
    .select('*')
    .eq('item_id', itemId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return (result.data as ItemQuestion[] | null) ?? [];
}

export async function createItemQuestion(itemId: string, title: string, body: string) {
  const result = await supabase.rpc('create_content_question', {
    target_item_id: itemId,
    question_title: title.trim(),
    question_body: body.trim(),
    question_tags: [],
  });
  if (result.error) throw result.error;
  return result.data;
}
