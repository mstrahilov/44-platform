import { isMissingRelationError } from '@/lib/schemaCompat';
import { supabase } from '@/lib/supabase';

export type CommunityQuestion = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  tags: string[];
  vote_count: number;
  answer_count: number;
  accepted_answer_id: string | null;
  has_accepted_answer: boolean;
  status: 'open' | 'closed' | 'archived';
  created_at: string;
  updated_at: string;
  authors?: {
    id: string;
    username?: string | null;
    slug?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type CommunityCollaboration = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  role_needed: string | null;
  project_type: string | null;
  status: 'open' | 'filled' | 'archived';
  created_at: string;
  updated_at: string;
  authors?: {
    id: string;
    username?: string | null;
    slug?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type CommunityQuestionAnswer = {
  id: string;
  question_id: string;
  author_id: string;
  body: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  authors?: {
    id: string;
    username?: string | null;
    slug?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type CommunityQuestionVote = {
  id: string;
  question_id: string | null;
  answer_id: string | null;
  profile_id: string;
  value: number;
};

export type CommunityCollaborationResponse = {
  id: string;
  collaboration_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  authors?: {
    id: string;
    username?: string | null;
    slug?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export async function loadCommunityQuestions(sort: 'recent' | 'unanswered' | 'votes' = 'recent') {
  let query = supabase
    .from('community_questions')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .neq('status', 'archived');

  if (sort === 'unanswered') {
    query = query.eq('answer_count', 0).order('created_at', { ascending: false });
  } else if (sort === 'votes') {
    query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const result = await query.limit(80);
  if (isMissingRelationError(result.error)) {
    return {
      rows: [] as CommunityQuestion[],
      requiresSetup: true,
      error: 'Questions tables are not in Supabase yet.',
    };
  }

  return {
    rows: (result.data as CommunityQuestion[] | null) ?? [],
    requiresSetup: false,
    error: result.error?.message ?? '',
  };
}

export async function loadCommunityCollaborations() {
  const result = await supabase
    .from('community_collaborations')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(80);

  if (isMissingRelationError(result.error)) {
    return {
      rows: [] as CommunityCollaboration[],
      requiresSetup: true,
      error: 'Collaboration tables are not in Supabase yet.',
    };
  }

  return {
    rows: (result.data as CommunityCollaboration[] | null) ?? [],
    requiresSetup: false,
    error: result.error?.message ?? '',
  };
}

export async function createCommunityQuestion(input: {
  authorId: string;
  title: string;
  body: string;
  tags: string[];
}) {
  return supabase
    .from('community_questions')
    .insert({
      author_id: input.authorId,
      title: input.title,
      body: input.body,
      tags: input.tags,
    })
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .single();
}

export async function createCommunityCollaboration(input: {
  authorId: string;
  title: string;
  body: string;
  roleNeeded: string;
  projectType: string;
}) {
  return supabase
    .from('community_collaborations')
    .insert({
      author_id: input.authorId,
      title: input.title,
      body: input.body,
      role_needed: input.roleNeeded || null,
      project_type: input.projectType || null,
    })
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .single();
}

export async function loadQuestionAnswers(questionId: string) {
  const answersResult = await supabase
    .from('community_question_answers')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .eq('question_id', questionId)
    .order('is_accepted', { ascending: false })
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true });

  if (isMissingRelationError(answersResult.error)) {
    return {
      rows: [] as CommunityQuestionAnswer[],
      error: 'Question answers tables are not in Supabase yet.',
    };
  }

  return {
    rows: (answersResult.data as CommunityQuestionAnswer[] | null) ?? [],
    error: answersResult.error?.message ?? '',
  };
}

export async function createQuestionAnswer(input: {
  questionId: string;
  authorId: string;
  body: string;
}) {
  return supabase
    .from('community_question_answers')
    .insert({
      question_id: input.questionId,
      author_id: input.authorId,
      body: input.body,
    })
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .single();
}

export async function loadQuestionVotes(questionId: string, answerIds: string[]) {
  const orParts = [`question_id.eq.${questionId}`];
  answerIds.forEach(answerId => orParts.push(`answer_id.eq.${answerId}`));
  const result = await supabase
    .from('community_question_votes')
    .select('id, question_id, answer_id, profile_id, value')
    .or(orParts.join(','));

  if (isMissingRelationError(result.error)) {
    return {
      rows: [] as CommunityQuestionVote[],
      error: 'Question votes tables are not in Supabase yet.',
    };
  }

  return {
    rows: (result.data as CommunityQuestionVote[] | null) ?? [],
    error: result.error?.message ?? '',
  };
}

export async function addQuestionVote(input: { profileId: string; questionId?: string; answerId?: string }) {
  return supabase.from('community_question_votes').insert({
    profile_id: input.profileId,
    question_id: input.questionId ?? null,
    answer_id: input.answerId ?? null,
    value: 1,
  });
}

export async function acceptQuestionAnswer(input: {
  questionId: string;
  answerId: string;
  ownerId: string;
}) {
  const resetResult = await supabase
    .from('community_question_answers')
    .update({ is_accepted: false })
    .eq('question_id', input.questionId);

  if (resetResult.error) return resetResult;

  const answerResult = await supabase
    .from('community_question_answers')
    .update({ is_accepted: true })
    .eq('id', input.answerId)
    .eq('question_id', input.questionId);

  if (answerResult.error) return answerResult;

  return supabase
    .from('community_questions')
    .update({
      accepted_answer_id: input.answerId,
      has_accepted_answer: true,
    })
    .eq('id', input.questionId)
    .eq('author_id', input.ownerId);
}

export async function loadCollaborationResponses(collaborationId: string) {
  const result = await supabase
    .from('community_collaboration_responses')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .eq('collaboration_id', collaborationId)
    .order('created_at', { ascending: false });

  if (isMissingRelationError(result.error)) {
    return {
      rows: [] as CommunityCollaborationResponse[],
      error: 'Collaboration responses tables are not in Supabase yet.',
    };
  }

  return {
    rows: (result.data as CommunityCollaborationResponse[] | null) ?? [],
    error: result.error?.message ?? '',
  };
}

export async function createCollaborationResponse(input: {
  collaborationId: string;
  authorId: string;
  body: string;
}) {
  return supabase
    .from('community_collaboration_responses')
    .insert({
      collaboration_id: input.collaborationId,
      author_id: input.authorId,
      body: input.body,
    })
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .single();
}
