export type PinType =
  | 'memory_trick'
  | 'implementation_tip'
  | 'exam_hint'
  | 'warning'
  | 'explanation';

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
  | 'answered';

export type SplitViewMode = 'question_only' | 'notes_only' | 'split';

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
  author: Author;
  likes: number;
  replies: Comment[];
  anchorText: string;
  documentId: string;
  pageIndex?: number;
}

export interface PublicQuestion {
  id: string;
  anchorText: string;
  content: string;
  author: Author;
  likes: number;
  replies: Comment[];
  documentId: string;
}

export interface ExamQuestion {
  id: string;
  number: number;
  text: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  confidence: ConfidenceLevel;
  noteReference?: {
    documentId: string;
    sectionId: string;
    highlightText: string;
    title: string;
  };
  intelligence: {
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
}

export interface PastExamDocument {
  id: string;
  name: string;
  type: 'past_exam';
  intro: string;
  questions: ExamQuestion[];
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

export interface TextSelection {
  text: string;
  rect: DOMRect;
}

export interface PracticeState {
  questionId: string;
  selectedIndex: number | null;
  submitted: boolean;
}
