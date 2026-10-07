import { formatRelativeTime } from './format';
import type { KnowledgePin, PinType, PublicQuestion } from '../types/workspace';
import type {
  FeedItemRead,
  KnowledgePinRead,
  LearningQuestionRead,
} from '../services/socialService';
import type { FeedAuthor, FeedItem, FeedPin, FeedQuestion } from '../components/feed/feedTypes';

const PIN_TYPE_FROM_API: Record<string, PinType> = {
  MEMORY_TRICK: 'memory_trick',
  EXPLANATION: 'explanation',
  EXAM_TIP: 'exam_hint',
  WARNING: 'warning',
  COMMON_MISTAKE: 'common_mistake',
  IMPLEMENTATION_TIP: 'implementation_tip',
  FORMULA_TIP: 'formula_tip',
  OTHER: 'other',
};

export const PIN_TYPE_TO_API: Record<PinType, string> = {
  memory_trick: 'MEMORY_TRICK',
  explanation: 'EXPLANATION',
  exam_hint: 'EXAM_TIP',
  warning: 'WARNING',
  common_mistake: 'COMMON_MISTAKE',
  implementation_tip: 'IMPLEMENTATION_TIP',
  formula_tip: 'FORMULA_TIP',
  other: 'OTHER',
};

function authorFromApi(
  author?: { id: string; full_name?: string | null } | null,
  relationship?: { is_following: boolean; is_self: boolean } | null,
) {
  // The backend's UserSummary always carries a real display name (it falls back
  // to the email local part server-side), so this is a last-resort guard only.
  const name = author?.full_name?.trim() || 'ExamReal Student';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  return {
    id: author?.id ?? '',
    name,
    initials,
    relationship: relationship
      ? { isFollowing: relationship.is_following, isSelf: relationship.is_self }
      : undefined,
  };
}

export function mapPinFromApi(pin: KnowledgePinRead): KnowledgePin {
  return {
    id: pin.id,
    type: PIN_TYPE_FROM_API[pin.pin_type] ?? 'explanation',
    content: pin.content,
    title: pin.title,
    author: authorFromApi(pin.author ?? { id: pin.author_id }, pin.relationship),
    likes: pin.likes_count,
    replies: [],
    anchorText: pin.selected_text_snapshot ?? '',
    documentId: pin.document_id,
    createdAt: formatRelativeTime(pin.created_at) || 'Recently',
    pageNumber: pin.page_number,
    locationMetadata: pin.location_metadata_json,
    isLikedByMe: pin.is_liked_by_me,
    isSavedByMe: pin.is_saved_by_me,
    source: pin.source ?? null,
  };
}

export function mapQuestionFromApi(question: LearningQuestionRead): PublicQuestion {
  return {
    id: question.id,
    title: question.title,
    anchorText: question.selected_text_snapshot ?? '',
    content: question.content,
    author: authorFromApi(
      question.author ?? { id: question.author_id },
      question.relationship,
    ),
    likes: question.likes_count,
    replies: [],
    documentId: question.document_id,
    createdAt: formatRelativeTime(question.created_at) || 'Recently',
    pageNumber: question.page_number,
    locationMetadata: question.location_metadata_json,
    status: question.status,
    isLikedByMe: question.is_liked_by_me,
    isSavedByMe: question.is_saved_by_me,
    source: question.source ?? null,
  };
}

function feedAuthorFromApi(item: FeedItemRead): FeedAuthor {
  // Same guarantee as authorFromApi: real names come from the backend.
  const name = item.author?.full_name?.trim() || 'ExamReal Student';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  return {
    id: item.author?.id ?? '',
    name,
    initials,
    department: item.author?.department ?? undefined,
  };
}

/** Maps a Knowledge Pin onto the shared card model. */
export function mapPinToCard(pin: KnowledgePinRead, author: FeedAuthor): FeedPin {
  return {
    id: pin.id,
    type: 'pin',
    pinType: PIN_TYPE_FROM_API[pin.pin_type] ?? 'explanation',
    course: pin.source?.course_code ?? pin.source?.course_title ?? '',
    courseId: pin.source?.course_id ?? '',
    topic: pin.title,
    anchorText: pin.selected_text_snapshot ?? '',
    content: pin.content,
    author,
    postedAt: formatRelativeTime(pin.created_at) || 'Recently',
    likes: pin.likes_count,
    saved: pin.is_saved_by_me,
    liked: pin.is_liked_by_me,
    documentId: pin.document_id,
    sectionId: pin.target_id ?? '',
    source: pin.source ?? null,
  };
}

/** Maps a Learning Question onto the shared card model. */
export function mapQuestionToCard(
  question: LearningQuestionRead,
  author: FeedAuthor,
  replyCount: number,
): FeedQuestion {
  return {
    id: question.id,
    type: 'question',
    course: question.source?.course_code ?? question.source?.course_title ?? '',
    courseId: question.source?.course_id ?? '',
    topic: question.title,
    anchorText: question.selected_text_snapshot ?? '',
    content: question.content,
    author,
    postedAt: formatRelativeTime(question.created_at) || 'Recently',
    likes: question.likes_count,
    liked: question.is_liked_by_me,
    saved: question.is_saved_by_me,
    replies: [],
    replyCount,
    documentId: question.document_id,
    sectionId: question.target_id ?? '',
    source: question.source ?? null,
  };
}

/**
 * Maps a unified feed entry onto the shared card model.
 */
export function mapFeedItemToCard(item: FeedItemRead): FeedItem | null {
  const author = feedAuthorFromApi(item);

  if (item.content_type === 'pins' && item.pin) {
    return mapPinToCard(item.pin, author);
  }

  if (item.content_type === 'questions' && item.question) {
    return mapQuestionToCard(item.question, author, item.reply_count);
  }

  // A feed row whose content vanished between the union and the load.
  return null;
}
