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
  picture?: string | null;
  department?: string | null;
}

/** The viewer's relationship with a content author. */
export interface AuthorRelationship {
  is_following: boolean;
  is_self: boolean;
}

/**
 * Resolved origin of a piece of community content.
 *
 * The server only sets `can_open` / `open_url` when a real destination exists,
 * so the UI must hide "Open in course" whenever `can_open` is false rather than
 * attempting navigation.
 */
export interface ContentSourceRead {
  document_id: string;
  document_title?: string | null;
  document_version?: number | null;
  course_id?: string | null;
  course_title?: string | null;
  course_code?: string | null;
  page_number?: number | null;
  target_type?: string | null;
  target_id?: string | null;
  selection_start_offset?: number | null;
  selection_end_offset?: number | null;
  selected_text_snapshot?: string | null;
  can_open: boolean;
  open_url?: string | null;
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
  relationship?: AuthorRelationship;
  is_liked_by_me: boolean;
  is_saved_by_me: boolean;
  source?: ContentSourceRead | null;
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
  relationship?: AuthorRelationship;
  is_liked_by_me: boolean;
  is_saved_by_me: boolean;
  source?: ContentSourceRead | null;
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

// ── User follows ────────────────────────────────────────────────────────────

export interface FollowUserResponse {
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

export interface FollowStateRead extends FollowUserResponse {
  is_self: boolean;
}

export function followUser(userId: string): Promise<FollowUserResponse> {
  return apiPost<FollowUserResponse>(`/follows/users/${userId}`);
}

export function unfollowUser(userId: string): Promise<FollowUserResponse> {
  return apiDelete<FollowUserResponse>(`/follows/users/${userId}`);
}

export function getUserFollowState(userId: string): Promise<FollowStateRead> {
  return apiGet<FollowStateRead>(`/follows/users/${userId}/state`);
}

export interface FollowUserSummary {
  id: string;
  full_name: string;
  picture?: string | null;
  department?: string | null;
  is_self: boolean;
  is_following: boolean;
  followers_count: number;
  following_count: number;
  followed_at?: string | null;
}

export function listMyFollowing(
  page = 1,
  size = 20,
  search?: string,
): Promise<Paginated<FollowUserSummary>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search?.trim()) params.set('search', search.trim());
  return apiGet<Paginated<FollowUserSummary>>(`/follows/users?${params.toString()}`);
}

export function listUserFollowers(
  userId: string,
  page = 1,
  size = 20,
): Promise<Paginated<FollowUserSummary>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<Paginated<FollowUserSummary>>(
    `/follows/users/${userId}/followers?${params.toString()}`,
  );
}

// ── People discovery & community profiles ───────────────────────────────────

export interface SharedCourseRead {
  id: string;
  title: string;
  code?: string | null;
  category?: string | null;
}

export interface RecommendedUserRead {
  id: string;
  full_name?: string | null;
  picture?: string | null;
  department?: string | null;
  same_department: boolean;
  shared_courses: SharedCourseRead[];
  recommendation_reasons: string[];
  is_following: boolean;
  follower_count: number;
}

export interface ProfileCourseRead extends SharedCourseRead {
  open_url?: string | null;
}

export interface CommunityStatsRead {
  total_pins: number;
  total_questions: number;
  total_answers: number;
  total_helpful_contributions: number;
  followers_count: number;
  following_users_count: number;
  following_courses_count: number;
  following_count: number;
}

export interface CommunityProfileRead {
  user: UserSummary;
  stats: CommunityStatsRead;
  public_pins: KnowledgePinRead[];
  public_questions: LearningQuestionRead[];
  is_following_user: boolean;
  relationship: AuthorRelationship;
  courses: ProfileCourseRead[];
  pins_total: number;
  questions_total: number;
  page: number;
  size: number;
}

export async function listRecommendedUsers(
  page = 1,
  size = 20,
): Promise<Paginated<RecommendedUserRead>> {
  const data = await apiGet<Paginated<RecommendedUserRead>>('/users/recommendations', {
    page,
    size,
  });
  return normalizePage(data, page, size);
}

export function getCommunityProfile(
  userId: string,
  page = 1,
  size = 10,
): Promise<CommunityProfileRead> {
  return apiGet<CommunityProfileRead>(`/users/${userId}/community-profile`, { page, size });
}

// ── Unified feed ─────────────────────────────────────────────────────────────

export type FeedScope = 'everyone' | 'following';
export type FeedContentType = 'all' | 'pins' | 'questions';

/** One entry in the unified feed: either a pin or a question. */
export interface FeedItemRead {
  content_type: FeedContentType;
  id: string;
  author?: UserSummary | null;
  relationship?: AuthorRelationship;
  created_at: string;
  pin?: KnowledgePinRead | null;
  question?: LearningQuestionRead | null;
  reply_count: number;
}

export interface FeedPageResponse {
  items: FeedItemRead[];
  total: number;
  page: number;
  size: number;
  has_more: boolean;
  scope: FeedScope;
  content_type: FeedContentType;
}

export interface FeedQuery {
  scope?: FeedScope;
  type?: FeedContentType;
  search?: string;
  /** Restrict the feed to one person selected in the Following rail. */
  authorId?: string | null;
  page?: number;
  size?: number;
}

/**
 * Chronological feed of questions and pins.
 *
 * The server merges both content types and paginates the combined set, so
 * walking `page` from 1 upward visits every item exactly once.
 */
export async function listFeed(query: FeedQuery = {}): Promise<FeedPageResponse> {
  const {
    scope = 'everyone',
    type = 'all',
    search,
    authorId,
    page = 1,
    size = 20,
  } = query;
  return apiGet<FeedPageResponse>('/community/feed-items', {
    scope,
    type,
    ...(search ? { search } : {}),
    ...(authorId ? { author_id: authorId } : {}),
    page,
    size,
  });
}
