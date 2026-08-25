import type { DocumentSelection } from './documentSelection';

export type { DocumentSelection };

export type PinType =
  | 'memory_trick'
  | 'implementation_tip'
  | 'exam_hint'
  | 'warning'
  | 'explanation'
  | 'common_mistake'
  | 'formula_tip'
  | 'other';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DocumentType = 'note' | 'past_exam';

export type WorkspacePhase =
  | 'idle'
  | 'reading_notes'
  | 'text_selected'
  | 'reading_past_exam'
  | 'practice_question'
  | 'submitted'
  | 'split_learning';

export type ContextPanelMode =
  | 'guidance'
  | 'notes_context'
  | 'pin_detail'
  | 'question_detail'
  | 'ai_tutor'
  | 'practice'
  | 'answered'
  | 'answer_history'
  | 'create_pin'
  | 'create_question';

export type NotesChipTab = 'guide' | 'pins' | 'questions';

export type SplitViewMode = 'question_only' | 'notes_only' | 'split' | 'expanded_note';

export interface Author {
  id: string;
  name: string;
  initials: string;
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  likes: number;
  createdAt: string;
  replies?: Comment[];
}

export interface KnowledgePin {
  id: string;
  type: PinType;
  content: string;
  title?: string;
  author: Author;
  likes: number;
  replies: Comment[];
  anchorText: string;
  documentId: string;
  createdAt: string;
  pageIndex?: number;
  pageNumber?: number;
  locationMetadata?: Record<string, unknown>;
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
}

export interface PublicQuestion {
  id: string;
  title?: string;
  anchorText: string;
  content: string;
  author: Author;
  likes: number;
  replies: Comment[];
  documentId: string;
  createdAt: string;
  pageNumber?: number;
  locationMetadata?: Record<string, unknown>;
  status?: string;
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
}

/** A course note block returned by the AI explanation as relevant material. */
export interface RelevantNote {
  contentBlockId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  contentSnippet: string;
  similarityScore: number;
}

/** Result of submitting a practice answer to the backend. */
export interface PracticeFeedback {
  studentAnswerId: string;
  isCorrect: boolean;
  correctChoiceLabel: string;
  correctChoiceText: string;
  aiExplanation: string;
  relevantNotes: RelevantNote[];
}

export interface ExamQuestion {
  id: string;
  number: number;
  text: string;
  choices: string[];
  /** Backend choice ids — required for real answer submission. */
  choiceIds?: string[];
  /** Only known after submission (or in mock data). */
  correctIndex?: number;
  explanation?: string;
  confidence?: ConfidenceLevel;
  pageNumber?: number | null;
  location?: Record<string, unknown> | null;
  noteReference?: {
    documentId: string;
    sectionId: string;
    highlightText: string;
    title: string;
  };
  intelligence?: {
    topic: string;
    mostAskedCount: number;
    yearsAppeared: number[];
  };
  pins: KnowledgePin[];
  publicQuestions: PublicQuestion[];
}

export interface NoteSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface NoteDocument {
  id: string;
  name: string;
  type: 'note';
  sections: NoteSection[];
  pins: KnowledgePin[];
  questions: PublicQuestion[];
  fileUrl?: string | null;
  fileType?: string | null;
  documentVersion?: number;
}

export interface PastExamDocument {
  id: string;
  name: string;
  type: 'past_exam';
  intro: string;
  questions: ExamQuestion[];
  fileUrl?: string | null;
  fileType?: string | null;
  documentVersion?: number;
}

export type CourseDocument = NoteDocument | PastExamDocument;

export interface ExplorerFolder {
  id: string;
  name: string;
  items: ExplorerItem[];
  defaultOpen?: boolean;
}

export interface ExplorerItem {
  id: string;
  name: string;
  documentId: string;
  type: DocumentType;
}

export interface CourseWorkspaceData {
  id: string;
  name: string;
  creator: string;
  folders: ExplorerFolder[];
  documents: Record<string, CourseDocument>;
}

/** @deprecated Use DocumentSelection */
export type TextSelection = DocumentSelection;

export interface PracticeState {
  questionId: string;
  selectedIndex: number | null;
  submitted: boolean;
  feedback?: PracticeFeedback | null;
}

export interface LocateTarget {
  anchorText: string;
  type: 'pin' | 'question';
}

export interface ExamHistoryItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  answeredAt: string;
  wasCorrect: boolean;
  selectedLabel?: string | null;
  selectedText?: string | null;
  correctLabel?: string | null;
  correctText?: string | null;
  aiExplanation?: string | null;
  studentAnswerId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  preview: string;
  dateGroup: 'Today' | 'Yesterday' | 'This Week' | 'Older';
  timestamp: string;
  messages: ChatMessage[];
}
