import { apiDelete, apiGet, apiPatch, apiPost, type QueryValue } from './apiClient';

export type ApiPinType =
  | 'MEMORY_TRICK'
  | 'EXPLANATION'
  | 'EXAM_TIP'
  | 'WARNING'
  | 'COMMON_MISTAKE'
  | 'IMPLEMENTATION_TIP'
  | 'FORMULA_TIP'
  | 'OTHER';

export type ApiVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';

export interface UserSummary {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export interface KnowledgePinRead {
  id: string;
  author_id: string;
  document_id: string;
  document_version: number;
  page_number: number;
  target_type: string;
  target_id?: string | null;
  selection_start_offset?: number | null;
  selection_end_offset?: number | null;
  selected_text_snapshot?: string | null;
  location_metadata_json: Record<string, unknown>;
  pin_type: ApiPinType;
  visibility: ApiVisibility;
  title: string;
  content: string;
  likes_count: number;
  saves_count: number;
  reports_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: UserSummary | null;
  is_liked_by_me: boolean;
  is_saved_by_me: boolean;
}

export interface LearningQuestionRead {
  id: string;
  author_id: string;
  document_id: string;
  document_version: number;
  page_number: number;
  target_type: string;
  target_id?: string | null;
  selection_start_offset?: number | null;
  selection_end_offset?: number | null;
  selected_text_snapshot?: string | null;
  location_metadata_json: Record<string, unknown>;
  title: string;
  content: string;
  visibility: ApiVisibility;
  status: string;
  answers_count: number;
  views_count: number;
  likes_count: number;
  saves_count: number;
  reports_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: UserSummary | null;
  is_liked_by_me: boolean;
  is_saved_by_me: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ReactionToggleResponse {
  is_reacted: boolean;
  reaction_type: string;
  new_count: number;
}

export interface SavedItemToggleResponse {
  is_saved: boolean;
  new_count: number;
}

export interface CreatePinPayload {
  title: string;
  content: string;
  pin_type: ApiPinType;
  visibility: ApiVisibility;
  page_number: number;
  target_type?: string;
  target_id?: string | null;
  selection_start_offset?: number;
  selection_end_offset?: number;
  selected_text_snapshot?: string;
  location_metadata_json: Record<string, unknown>;
  document_id: string;
  document_version: number;
}

export interface UpdatePinPayload {
  title?: string;
  content?: string;
  pin_type?: ApiPinType;
  visibility?: ApiVisibility;
  selection_start_offset?: number;
  selection_end_offset?: number;
  selected_text_snapshot?: string;
  location_metadata_json?: Record<string, unknown>;
}

export interface CreateQuestionPayload {
  title: string;
  content: string;
  visibility: ApiVisibility;
  page_number: number;
  target_type?: string;
  target_id?: string | null;
  selection_start_offset?: number;
  selection_end_offset?: number;
  selected_text_snapshot?: string;
  location_metadata_json: Record<string, unknown>;
  document_id: string;
  document_version: number;
}

export interface UpdateQuestionPayload {
  title?: string;
  content?: string;
  visibility?: ApiVisibility;
  status?: string;
  selection_start_offset?: number;
  selection_end_offset?: number;
  selected_text_snapshot?: string;
  location_metadata_json?: Record<string, unknown>;
}

export interface QuestionReplyRead {
  id: string;
  question_id: string;
  parent_reply_id?: string | null;
  author_id: string;
  content: string;
  is_accepted_answer: boolean;
  likes_count: number;
  reports_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: UserSummary | null;
  is_liked_by_me: boolean;
  children: QuestionReplyRead[];
}

export interface QuestionReplyTreeResponse {
  question_id: string;
  total_replies: number;
  tree: QuestionReplyRead[];
}

function normalizePage<T>(response: Paginated<T> | null, page: number, size: number): Paginated<T> {
  return {
    items: Array.isArray(response?.items) ? response!.items : [],
    total: response?.total ?? 0,
    page: response?.page || page,
    size: response?.size || size,
  };
}

// ── Knowledge Pins ──────────────────────────────────────────────────────────

export async function createPin(payload: CreatePinPayload): Promise<KnowledgePinRead> {
  return apiPost<KnowledgePinRead>('/pins', payload);
}

export async function listPins(
  query: Record<string, QueryValue> = {},
  page = 1,
  size = 100,
): Promise<Paginated<KnowledgePinRead>> {
  const data = await apiGet<Paginated<KnowledgePinRead>>('/pins', { ...query, page, size });
  return normalizePage(data, page, size);
}

export async function getPin(pinId: string): Promise<KnowledgePinRead> {
  return apiGet<KnowledgePinRead>(`/pins/${pinId}`);
}

export async function updatePin(pinId: string, payload: UpdatePinPayload): Promise<KnowledgePinRead> {
  return apiPatch<KnowledgePinRead>(`/pins/${pinId}`, payload);
}

export async function deletePin(pinId: string): Promise<void> {
  return apiDelete(`/pins/${pinId}`);
}

export async function togglePinLike(pinId: string): Promise<ReactionToggleResponse> {
  return apiPost<ReactionToggleResponse>(`/pins/${pinId}/like`);
}

export async function togglePinSave(pinId: string): Promise<SavedItemToggleResponse> {
  return apiPost<SavedItemToggleResponse>(`/pins/${pinId}/save`);
}

// ── Learning Questions ──────────────────────────────────────────────────────

export async function createLearningQuestion(payload: CreateQuestionPayload): Promise<LearningQuestionRead> {
  return apiPost<LearningQuestionRead>('/learning-questions', payload);
}

export async function listLearningQuestions(
  query: Record<string, QueryValue> = {},
  page = 1,
  size = 100,
): Promise<Paginated<LearningQuestionRead>> {
  const data = await apiGet<Paginated<LearningQuestionRead>>('/learning-questions', {
    ...query,
    page,
    size,
  });
  return normalizePage(data, page, size);
}

export async function getLearningQuestion(questionId: string): Promise<LearningQuestionRead> {
  return apiGet<LearningQuestionRead>(`/learning-questions/${questionId}`);
}

export async function updateLearningQuestion(
  questionId: string,
  payload: UpdateQuestionPayload,
): Promise<LearningQuestionRead> {
  return apiPatch<LearningQuestionRead>(`/learning-questions/${questionId}`, payload);
}

export async function deleteLearningQuestion(questionId: string): Promise<void> {
  return apiDelete(`/learning-questions/${questionId}`);
}

export async function toggleQuestionLike(questionId: string): Promise<ReactionToggleResponse> {
  return apiPost<ReactionToggleResponse>(`/learning-questions/${questionId}/like`);
}

export async function toggleQuestionSave(questionId: string): Promise<SavedItemToggleResponse> {
  return apiPost<SavedItemToggleResponse>(`/learning-questions/${questionId}/save`);
}

export async function getQuestionReplies(questionId: string): Promise<QuestionReplyTreeResponse> {
  return apiGet<QuestionReplyTreeResponse>(`/learning-questions/${questionId}/replies`);
}

export async function createQuestionReply(
  questionId: string,
  payload: { content: string; parent_reply_id?: string | null },
): Promise<QuestionReplyRead> {
  return apiPost<QuestionReplyRead>(`/learning-questions/${questionId}/replies`, payload);
}

export async function updateQuestionReply(
  questionId: string,
  replyId: string,
  payload: { content: string },
): Promise<QuestionReplyRead> {
  return apiPatch<QuestionReplyRead>(`/learning-questions/${questionId}/replies/${replyId}`, payload);
}

export async function deleteQuestionReply(questionId: string, replyId: string): Promise<void> {
  return apiDelete(`/learning-questions/${questionId}/replies/${replyId}`);
}

export async function toggleReplyLike(
  questionId: string,
  replyId: string,
): Promise<ReactionToggleResponse> {
  return apiPost<ReactionToggleResponse>(`/learning-questions/${questionId}/replies/${replyId}/like`);
}

export async function acceptQuestionReply(
  questionId: string,
  replyId: string,
): Promise<QuestionReplyRead> {
  return apiPost<QuestionReplyRead>(`/learning-questions/${questionId}/replies/${replyId}/accept`);
}
