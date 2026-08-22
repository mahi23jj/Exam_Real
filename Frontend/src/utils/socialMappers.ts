import { formatRelativeTime } from './format';
import type { KnowledgePin, PinType, PublicQuestion } from '../types/workspace';
import type { KnowledgePinRead, LearningQuestionRead } from '../services/socialService';

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

function authorFromApi(author?: { id: string; full_name?: string | null } | null) {
  const name = author?.full_name?.trim() || 'Unknown';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  return { id: author?.id ?? '', name, initials };
}

export function mapPinFromApi(pin: KnowledgePinRead): KnowledgePin {
  return {
    id: pin.id,
    type: PIN_TYPE_FROM_API[pin.pin_type] ?? 'explanation',
    content: pin.content,
    title: pin.title,
    author: authorFromApi(pin.author),
    likes: pin.likes_count,
    replies: [],
    anchorText: pin.selected_text_snapshot ?? '',
    documentId: pin.document_id,
    createdAt: formatRelativeTime(pin.created_at) || 'Recently',
    pageNumber: pin.page_number,
    locationMetadata: pin.location_metadata_json,
    isLikedByMe: pin.is_liked_by_me,
    isSavedByMe: pin.is_saved_by_me,
  };
}

export function mapQuestionFromApi(question: LearningQuestionRead): PublicQuestion {
  return {
    id: question.id,
    title: question.title,
    anchorText: question.selected_text_snapshot ?? '',
    content: question.content,
    author: authorFromApi(question.author),
    likes: question.likes_count,
    replies: [],
    documentId: question.document_id,
    createdAt: formatRelativeTime(question.created_at) || 'Recently',
    pageNumber: question.page_number,
    locationMetadata: question.location_metadata_json,
    status: question.status,
    isLikedByMe: question.is_liked_by_me,
    isSavedByMe: question.is_saved_by_me,
  };
}
