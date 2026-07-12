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
    .from('community_question_content')
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
    .from('community_collaboration_content')
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
  const created = await supabase.rpc('create_content_question', {
    question_title: input.title,
    question_body: input.body,
    question_tags: input.tags,
    target_item_id: undefined,
  });
  if (created.error) return { data: null, error: created.error };
  return supabase
    .from('community_question_content')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .eq('id', created.data)
    .single();
}

export async function createCommunityCollaboration(input: {
  authorId: string;
  title: string;
  body: string;
  roleNeeded: string;
  projectType: string;
}) {
  const created = await supabase.rpc('create_content_collaboration', {
    collaboration_title: input.title,
    collaboration_body: input.body,
    needed_role: input.roleNeeded || undefined,
    collaboration_project_type: input.projectType || undefined,
    target_item_id: undefined,
  });
  if (created.error) return { data: null, error: created.error };
  return supabase
    .from('community_collaboration_content')
    .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
    .eq('id', created.data)
    .single();
}

export async function deleteCommunityQuestion(input: { questionId: string; ownerId: string }) {
  return supabase
    .from('content_entries')
    .delete()
    .eq('id', input.questionId)
    .eq('author_id', input.ownerId);
}

export async function deleteCommunityDiscussion(input: { discussionId: string; ownerId: string }) {
  return supabase
    .from('content_entries')
    .delete()
    .eq('id', input.discussionId)
    .eq('author_id', input.ownerId);
}

export async function deleteQuestionAnswer(input: { answerId: string; ownerId: string }) {
  return supabase
    .from('content_replies')
    .delete()
    .eq('id', input.answerId)
    .eq('author_id', input.ownerId);
}

export async function loadQuestionAnswers(questionId: string) {
  const answersResult = await supabase
    .from('community_question_answer_content')
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
    .from('content_replies')
    .insert({
      entry_id: input.questionId,
      author_id: input.authorId,
      reply_type: 'answer',
      body: input.body,
    })
    .select('id')
    .single()
    .then(async created => {
      if (created.error) return { data: null, error: created.error };
      return supabase
        .from('community_question_answer_content')
        .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
        .eq('id', created.data.id)
        .single();
    });
}

export async function loadQuestionVotes(questionId: string, answerIds: string[]) {
  const orParts = [`question_id.eq.${questionId}`];
  answerIds.forEach(answerId => orParts.push(`answer_id.eq.${answerId}`));
  const result = await supabase
    .from('community_question_vote_content')
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
  if (input.questionId) {
    return supabase.from('content_entry_reactions').insert({
      entry_id: input.questionId,
      profile_id: input.profileId,
      reaction_type: 'upvote',
    });
  }
  return supabase.from('content_reply_reactions').insert({
    reply_id: input.answerId as string,
    profile_id: input.profileId,
    reaction_type: 'upvote',
  });
}

export async function acceptQuestionAnswer(input: {
  questionId: string;
  answerId: string;
  ownerId: string;
}) {
  return supabase.rpc('accept_content_answer', {
    target_question_id: input.questionId,
    target_reply_id: input.answerId,
  });
}

export async function loadCollaborationResponses(collaborationId: string) {
  const result = await supabase
    .from('community_collaboration_response_content')
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
    .from('content_replies')
    .insert({
      entry_id: input.collaborationId,
      author_id: input.authorId,
      reply_type: 'collaboration_response',
      body: input.body,
    })
    .select('id')
    .single()
    .then(async created => {
      if (created.error) return { data: null, error: created.error };
      return supabase
        .from('community_collaboration_response_content')
        .select('*, authors:profiles!author_id(id, username, slug, display_name, avatar_url)')
        .eq('id', created.data.id)
        .single();
    });
}

export async function updateCommunityCollaborationStatus(input: {
  collaborationId: string;
  ownerId: string;
  status: CommunityCollaboration['status'];
}) {
  return supabase
    .from('content_collaboration_details')
    .update({ collaboration_status: input.status })
    .eq('entry_id', input.collaborationId);
}

export async function deleteCommunityCollaboration(input: { collaborationId: string; ownerId: string }) {
  return supabase
    .from('content_entries')
    .delete()
    .eq('id', input.collaborationId)
    .eq('author_id', input.ownerId);
}

export async function deleteCollaborationResponse(input: { responseId: string; ownerId: string }) {
  return supabase
    .from('content_replies')
    .delete()
    .eq('id', input.responseId)
    .eq('author_id', input.ownerId);
}
