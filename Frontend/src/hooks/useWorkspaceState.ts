import { useReducer, useCallback, useEffect } from 'react';
import type {
  WorkspacePhase,
  ContextPanelMode,
  NotesChipTab,
  SplitViewMode,
  DocumentSelection,
  PracticeState,
  KnowledgePin,
  PublicQuestion,
  CourseDocument,
  LocateTarget,
  ExamHistoryItem,
} from '../types/workspace';

export interface WorkspaceState {
  phase: WorkspacePhase;
  contextMode: ContextPanelMode;
  notesTab: NotesChipTab;
  activeDocumentId: string | null;
  activeDocument: CourseDocument | null;
  selection: DocumentSelection | null;
  selectedPinId: string | null;
  selectedQuestionId: string | null;
  practice: PracticeState | null;
  splitMode: SplitViewMode;
  locateTarget: LocateTarget | null;
  examHistory: ExamHistoryItem[];
  chatHistoryOpen: boolean;
  focusMode: boolean;
  explorerOpen: boolean;
  contextOpen: boolean;
  mobileView: 'explorer' | 'document' | 'context';
  openFolders: Set<string>;
}

type WorkspaceAction =
  | { type: 'OPEN_DOCUMENT'; documentId: string; document: CourseDocument }
  | { type: 'SELECT_TEXT'; selection: DocumentSelection }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_NOTES_TAB'; tab: NotesChipTab }
  | { type: 'LOCATE_IN_DOCUMENT'; target: LocateTarget }
  | { type: 'CLEAR_LOCATE' }
  | { type: 'OPEN_PIN'; pinId: string }
  | { type: 'OPEN_PUBLIC_QUESTION'; questionId: string }
  | { type: 'START_PRACTICE'; questionId: string }
  | { type: 'SELECT_ANSWER'; index: number }
  | { type: 'SUBMIT_ANSWER'; historyItem: ExamHistoryItem }
  | { type: 'OPEN_SPLIT_LEARNING' }
  | { type: 'SET_SPLIT_MODE'; mode: SplitViewMode }
  | { type: 'CLOSE_SPLIT' }
  | { type: 'SET_CONTEXT_MODE'; mode: ContextPanelMode }
  | { type: 'SET_CHAT_HISTORY_OPEN'; open: boolean }
  | { type: 'TOGGLE_FOCUS' }
  | { type: 'SET_FOCUS'; enabled: boolean }
  | { type: 'TOGGLE_FOLDER'; folderId: string }
  | { type: 'SET_EXPLORER_OPEN'; open: boolean }
  | { type: 'SET_CONTEXT_OPEN'; open: boolean }
  | { type: 'SET_MOBILE_VIEW'; view: 'explorer' | 'document' | 'context' }
  | { type: 'RESET_CONTEXT' };

function derivePhase(state: WorkspaceState): WorkspacePhase {
  if (state.splitMode === 'split' || state.splitMode === 'expanded_note' || state.splitMode === 'notes_only') {
    return 'split_learning';
  }
  if (state.practice?.submitted) return 'submitted';
  if (state.practice && !state.practice.submitted) return 'practice_question';
  if (state.selection) return 'text_selected';
  if (state.activeDocument?.type === 'past_exam') return 'reading_past_exam';
  if (state.activeDocument?.type === 'note') return 'reading_notes';
  return 'idle';
}

function getInitialContextMode(document: CourseDocument | null): ContextPanelMode {
  if (!document) return 'guidance';
  return document.type === 'note' ? 'notes_context' : 'guidance';
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'OPEN_DOCUMENT': {
      const isNote = action.document.type === 'note';
      return {
        ...state,
        activeDocumentId: action.documentId,
        activeDocument: action.document,
        phase: isNote ? 'reading_notes' : 'reading_past_exam',
        contextMode: getInitialContextMode(action.document),
        notesTab: 'guide',
        selection: null,
        selectedPinId: null,
        selectedQuestionId: null,
        practice: null,
        splitMode: 'question_only',
        locateTarget: null,
        mobileView: 'document',
      };
    }
    case 'SELECT_TEXT':
      return { ...state, selection: action.selection, phase: 'text_selected' };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: null,
        phase: state.activeDocument?.type === 'note' ? 'reading_notes' : state.phase,
      };
    case 'SET_NOTES_TAB':
      return { ...state, notesTab: action.tab, contextMode: 'notes_context' };
    case 'LOCATE_IN_DOCUMENT':
      return {
        ...state,
        locateTarget: action.target,
        mobileView: 'document',
      };
    case 'CLEAR_LOCATE':
      return { ...state, locateTarget: null };
    case 'OPEN_PIN':
      return {
        ...state,
        selectedPinId: action.pinId,
        contextMode: 'pin_detail',
        contextOpen: true,
        mobileView: 'context',
      };
    case 'OPEN_PUBLIC_QUESTION':
      return {
        ...state,
        selectedQuestionId: action.questionId,
        contextMode: 'question_detail',
        contextOpen: true,
        mobileView: 'context',
      };
    case 'START_PRACTICE':
      return {
        ...state,
        practice: { questionId: action.questionId, selectedIndex: null, submitted: false },
        contextMode: 'practice',
        contextOpen: true,
        selection: null,
        splitMode: 'question_only',
        phase: 'practice_question',
        mobileView: 'context',
      };
    case 'SELECT_ANSWER':
      if (!state.practice || state.practice.submitted) return state;
      return { ...state, practice: { ...state.practice, selectedIndex: action.index } };
    case 'SUBMIT_ANSWER':
      if (!state.practice) return state;
      return {
        ...state,
        practice: { ...state.practice, submitted: true },
        contextMode: 'answered',
        phase: 'submitted',
        examHistory: [action.historyItem, ...state.examHistory].slice(0, 5),
      };
    case 'OPEN_SPLIT_LEARNING':
      return { ...state, splitMode: 'split', phase: 'split_learning', contextOpen: true };
    case 'SET_SPLIT_MODE':
      return {
        ...state,
        splitMode: action.mode,
        phase:
          action.mode === 'question_only' && state.practice?.submitted
            ? 'submitted'
            : action.mode !== 'question_only'
              ? 'split_learning'
              : state.phase,
      };
    case 'CLOSE_SPLIT':
      return {
        ...state,
        splitMode: 'question_only',
        phase: state.practice?.submitted ? 'submitted' : state.phase,
      };
    case 'SET_CONTEXT_MODE':
      return { ...state, contextMode: action.mode };
    case 'SET_CHAT_HISTORY_OPEN':
      return { ...state, chatHistoryOpen: action.open };
    case 'TOGGLE_FOCUS':
      return { ...state, focusMode: !state.focusMode };
    case 'SET_FOCUS':
      return { ...state, focusMode: action.enabled };
    case 'TOGGLE_FOLDER': {
      const next = new Set(state.openFolders);
      if (next.has(action.folderId)) next.delete(action.folderId);
      else next.add(action.folderId);
      return { ...state, openFolders: next };
    }
    case 'SET_EXPLORER_OPEN':
      return { ...state, explorerOpen: action.open };
    case 'SET_CONTEXT_OPEN':
      return { ...state, contextOpen: action.open };
    case 'SET_MOBILE_VIEW':
      return { ...state, mobileView: action.view };
    case 'RESET_CONTEXT':
      return {
        ...state,
        contextMode: getInitialContextMode(state.activeDocument),
        notesTab: 'guide',
        selectedPinId: null,
        selectedQuestionId: null,
        selection: null,
      };
    default:
      return state;
  }
}

export function useWorkspaceState(
  initialDocumentId: string | null,
  initialDocument: CourseDocument | null,
  defaultOpenFolders: string[],
) {
  const initialState: WorkspaceState = {
    phase: initialDocument ? (initialDocument.type === 'note' ? 'reading_notes' : 'reading_past_exam') : 'idle',
    contextMode: getInitialContextMode(initialDocument),
    notesTab: 'guide',
    activeDocumentId: initialDocumentId,
    activeDocument: initialDocument,
    selection: null,
    selectedPinId: null,
    selectedQuestionId: null,
    practice: null,
    splitMode: 'question_only',
    locateTarget: null,
    examHistory: [],
    chatHistoryOpen: false,
    focusMode: false,
    explorerOpen: true,
    contextOpen: true,
    mobileView: 'document',
    openFolders: new Set(defaultOpenFolders),
  };

  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        dispatch({ type: 'TOGGLE_FOCUS' });
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'CLEAR_SELECTION' });
        dispatch({ type: 'SET_CHAT_HISTORY_OPEN', open: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!state.locateTarget) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_LOCATE' }), 3000);
    return () => clearTimeout(timer);
  }, [state.locateTarget]);

  const openDocument = useCallback((documentId: string, document: CourseDocument) => {
    dispatch({ type: 'OPEN_DOCUMENT', documentId, document });
  }, []);

  const selectText = useCallback((selection: DocumentSelection) => {
    dispatch({ type: 'SELECT_TEXT', selection });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const locateInDocument = useCallback((target: LocateTarget) => {
    dispatch({ type: 'LOCATE_IN_DOCUMENT', target });
  }, []);

  const openPin = useCallback((pinId: string) => {
    dispatch({ type: 'OPEN_PIN', pinId });
  }, []);

  const openPublicQuestion = useCallback((questionId: string) => {
    dispatch({ type: 'OPEN_PUBLIC_QUESTION', questionId });
  }, []);

  const startPractice = useCallback((questionId: string) => {
    dispatch({ type: 'START_PRACTICE', questionId });
  }, []);

  const selectAnswer = useCallback((index: number) => {
    dispatch({ type: 'SELECT_ANSWER', index });
  }, []);

  const submitAnswer = useCallback((historyItem: ExamHistoryItem) => {
    dispatch({ type: 'SUBMIT_ANSWER', historyItem });
  }, []);

  const openSplitLearning = useCallback(() => {
    dispatch({ type: 'OPEN_SPLIT_LEARNING' });
  }, []);

  const setSplitMode = useCallback((mode: SplitViewMode) => {
    dispatch({ type: 'SET_SPLIT_MODE', mode });
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    dispatch({ type: 'TOGGLE_FOLDER', folderId });
  }, []);

  const computedPhase = derivePhase(state);

  return {
    state: { ...state, phase: computedPhase },
    dispatch,
    openDocument,
    selectText,
    clearSelection,
    locateInDocument,
    openPin,
    openPublicQuestion,
    startPractice,
    selectAnswer,
    submitAnswer,
    openSplitLearning,
    setSplitMode,
    toggleFolder,
  };
}

export type { KnowledgePin, PublicQuestion };
