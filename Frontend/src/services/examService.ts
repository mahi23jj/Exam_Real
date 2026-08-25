import { apiGet, apiPost } from './apiClient';
import type {
  ExamQuestion,
  PracticeFeedback,
  ExamHistoryItem,
  RelevantNote,
  ConfidenceLevel,
} from '../types/workspace';

/** Question as returned by GET /documents/{document_id}/questions (correct answers hidden). */
export interface ApiExamChoice {
  id: string;
  choice_label: string;
  choice_text: string;
}

export interface ApiExamQuestion {
  id: string;
  exam_id: string;
  question_number: number;
  question_text: string;
  question_image_url?: string | null;
  page_number?: number | null;
  location?: Record<string, unknown> | null;
  subtopic?: string | null;
  difficulty?: string | null;
  question_type?: string | null;
  choices: ApiExamChoice[];
}

export type ApiConfidenceLevel = 'CONFIDENT' | 'UNSURE' | 'GUESS';

export interface SubmitAnswerPayload {
  selected_choice_id: string;
  confidence: ApiConfidenceLevel;
  reasoning_text?: string | null;
}

export interface ApiRelevantNoteBlock {
  content_block_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  content_snippet: string;
  similarity_score: number;
}

export interface ApiAnswerFeedback {
  student_answer_id: string;
  question_id: string;
  selected_choice_id: string;
  is_correct: boolean;
  correct_choice_label: string;
  correct_choice_text: string;
  ai_explanation: string;
  relevant_notes: ApiRelevantNoteBlock[];
}

export interface ApiAnswerHistoryItem {
  answer_id: string;
  question_id: string;
  question_number: number;
  question_text: string;
  selected_choice_label?: string | null;
  selected_choice_text?: string | null;
  is_correct?: boolean | null;
  correct_choice_label?: string | null;
  correct_choice_text?: string | null;
  ai_explanation?: string | null;
  confidence?: string | null;
  answered_at: string;
}

/** Questions for a PAST_EXAM document (uses document_id, not exam_id). */
export async function fetchDocumentQuestions(documentId: string): Promise<ApiExamQuestion[]> {
  const data = await apiGet<ApiExamQuestion[]>(`/documents/${documentId}/questions`);
  return Array.isArray(data) ? data : [];
}

/** Submit a practice answer; unlocks correct answer, AI explanation and relevant notes. */
export async function submitPracticeAnswer(
  questionId: string,
  payload: SubmitAnswerPayload
): Promise<ApiAnswerFeedback> {
  return apiPost<ApiAnswerFeedback>(`/questions/${questionId}/submit`, payload);
}

/** The current student's previous attempts for this past-exam document. */
export async function fetchDocumentAnswerHistory(
  documentId: string
): Promise<ApiAnswerHistoryItem[]> {
  const data = await apiGet<ApiAnswerHistoryItem[]>(`/documents/${documentId}/answers/history`);
  return Array.isArray(data) ? data : [];
}

// ── Mappers to workspace types ───────────────────────────────────────────────

function mapDifficulty(difficulty?: string | null): ConfidenceLevel | undefined {
  if (difficulty === 'EASY') return 'low';
  if (difficulty === 'HARD') return 'high';
  if (difficulty === 'MEDIUM') return 'medium';
  return undefined;
}

export function mapApiQuestionToWorkspace(q: ApiExamQuestion): ExamQuestion {
  return {
    id: q.id,
    number: q.question_number,
    text: q.question_text,
    choices: q.choices.map((c) => c.choice_text),
    choiceIds: q.choices.map((c) => c.id),
    pageNumber: q.page_number ?? null,
    location: q.location ?? null,
    confidence: mapDifficulty(q.difficulty),
    pins: [],
    publicQuestions: [],
  };
}

export function mapApiRelevantNotes(notes: ApiRelevantNoteBlock[]): RelevantNote[] {
  return notes.map((n) => ({
    contentBlockId: n.content_block_id,
    documentId: n.document_id,
    documentTitle: n.document_title,
    pageNumber: n.page_number,
    contentSnippet: n.content_snippet,
    similarityScore: n.similarity_score,
  }));
}

export function mapApiFeedbackToPracticeFeedback(fb: ApiAnswerFeedback): PracticeFeedback {
  return {
    studentAnswerId: fb.student_answer_id,
    isCorrect: fb.is_correct,
    correctChoiceLabel: fb.correct_choice_label,
    correctChoiceText: fb.correct_choice_text,
    aiExplanation: fb.ai_explanation,
    relevantNotes: mapApiRelevantNotes(fb.relevant_notes ?? []),
  };
}

export function mapApiHistoryToExamHistoryItem(h: ApiAnswerHistoryItem): ExamHistoryItem {
  const date = new Date(h.answered_at);
  return {
    questionId: h.question_id,
    questionNumber: h.question_number,
    questionText: h.question_text,
    answeredAt: Number.isNaN(date.getTime()) ? h.answered_at : date.toLocaleString(),
    wasCorrect: Boolean(h.is_correct),
    selectedLabel: h.selected_choice_label ?? null,
    selectedText: h.selected_choice_text ?? null,
    correctLabel: h.correct_choice_label ?? null,
    correctText: h.correct_choice_text ?? null,
    aiExplanation: h.ai_explanation ?? null,
    studentAnswerId: h.answer_id,
  };
}
