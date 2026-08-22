import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

import { getCourse } from '../services/courseService';
import { fetchCourseDocuments } from '../services/documentService';
import {
  createPin,
  createLearningQuestion,
  listPins,
  listLearningQuestions,
} from '../services/socialService';
import { mapCourseToWorkspace } from '../utils/mapCourseWorkspace';
import { mapPinFromApi, mapQuestionFromApi, PIN_TYPE_TO_API } from '../utils/socialMappers';
import { useWorkspaceState } from '../hooks/useWorkspaceState';
import type {
  PastExamDocument,
  ExamQuestion,
  NoteDocument,
  KnowledgePin,
  PublicQuestion,
  ChatConversation,
} from '../types/workspace';

import CourseHeader from '../components/workspace/CourseHeader';
import CourseExplorer from '../components/workspace/CourseExplorer';
import DocumentViewer from '../components/workspace/DocumentViewer';
import ContextPanel from '../components/workspace/ContextPanel';
import FloatingSelectionToolbar from '../components/workspace/FloatingSelectionToolbar';
import FocusModeLayout from '../components/workspace/FocusModeLayout';
import ChatHistoryDrawer from '../components/workspace/ChatHistoryDrawer';

const MOCK_CHAT_HISTORY: ChatConversation[] = [
  {
    id: 'c1',
    preview: 'Why does priority scheduling cause starvation?',
    dateGroup: 'Today',
    timestamp: '2h ago',
    messages: [
      { id: 'm1', role: 'user', content: 'Why does priority scheduling cause starvation?', timestamp: '2h ago' },
      { id: 'm2', role: 'ai', content: 'High-priority processes can continuously preempt lower-priority ones, preventing them from ever running.', timestamp: '2h ago' },
    ],
  },
  {
    id: 'c2',
    preview: 'Explain page fault handling',
    dateGroup: 'Yesterday',
    timestamp: '1d ago',
    messages: [
      { id: 'm3', role: 'user', content: 'Explain page fault handling', timestamp: '1d ago' },
      { id: 'm4', role: 'ai', content: 'When a page is not in memory, the OS loads it from disk into a free frame and updates the page table.', timestamp: '1d ago' },
    ],
  },
];

const CourseWorkspace: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const [courseData, setCourseData] = useState<ReturnType<typeof mapCourseToWorkspace> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, docs] = await Promise.all([
        getCourse(courseId),
        fetchCourseDocuments(courseId, { status: ['COMPLETED'] }),
      ]);
      setCourseData(mapCourseToWorkspace(course, docs));
      setError(null);
    } catch (err) {
      setCourseData(null);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const defaultOpenFolders = useMemo(
    () => courseData?.folders.filter((f) => f.defaultOpen).map((f) => f.id) ?? ['folder-notes', 'folder-exams'],
    [courseData],
  );

  const {
    state,
    dispatch,
    openDocument,
    selectText,
    clearSelection,
    locateInDocument,
    startPractice,
    selectAnswer,
    submitAnswer,
    openSplitLearning,
    setSplitMode,
    toggleFolder,
  } = useWorkspaceState(null, null, defaultOpenFolders);

  const [searchQuery, setSearchQuery] = useState('');
  const [jumpToQuestionId, setJumpToQuestionId] = useState<string | null>(null);
  const [documentAnnotations, setDocumentAnnotations] = useState<
    Record<string, { pins: KnowledgePin[]; questions: PublicQuestion[] }>
  >({});
  const [savingPin, setSavingPin] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const loadDocumentAnnotations = useCallback(async (documentId: string) => {
    try {
      const [pinsRes, questionsRes] = await Promise.all([
        listPins({ document_id: documentId }),
        listLearningQuestions({ document_id: documentId }),
      ]);
      setDocumentAnnotations((prev) => ({
        ...prev,
        [documentId]: {
          pins: pinsRes.items.map(mapPinFromApi),
          questions: questionsRes.items.map(mapQuestionFromApi),
        },
      }));
    } catch {
      setDocumentAnnotations((prev) => ({
        ...prev,
        [documentId]: prev[documentId] ?? { pins: [], questions: [] },
      }));
    }
  }, []);

  useEffect(() => {
    if (!state.activeDocumentId) return;
    void loadDocumentAnnotations(state.activeDocumentId);
  }, [state.activeDocumentId, loadDocumentAnnotations]);

  const activeNoteDoc = useMemo(() => {
    if (state.activeDocument?.type !== 'note') return null;
    const base = state.activeDocument as NoteDocument;
    const annotations = documentAnnotations[base.id];
    return {
      ...base,
      pins: annotations?.pins ?? base.pins,
      questions: annotations?.questions ?? base.questions,
    };
  }, [state.activeDocument, documentAnnotations]);

  const activeDocument = useMemo(() => {
    if (state.activeDocument?.type === 'note' && activeNoteDoc) return activeNoteDoc;
    return state.activeDocument;
  }, [state.activeDocument, activeNoteDoc]);

  const practiceQuestion: ExamQuestion | null = useMemo(() => {
    if (!state.practice || state.activeDocument?.type !== 'past_exam') return null;
    const exam = state.activeDocument as PastExamDocument;
    return exam.questions.find((q) => q.id === state.practice!.questionId) ?? null;
  }, [state.practice, state.activeDocument]);

  const highlightSectionId = useMemo(() => {
    if (state.splitMode !== 'question_only' && practiceQuestion?.noteReference) {
      return practiceQuestion.noteReference.sectionId;
    }
    return null;
  }, [state.splitMode, practiceQuestion]);

  const handleFileSelect = (documentId: string) => {
    const doc = courseData?.documents[documentId];
    if (doc) {
      openDocument(documentId, doc);
    }
  };

  useEffect(() => {
    const targetId = (location.state as { documentId?: string } | null)?.documentId;
    if (!targetId || !courseData) return;
    const doc = courseData.documents[targetId];
    if (doc) {
      openDocument(targetId, doc);
    }
  }, [courseData, location.state, openDocument]);

  const handlePinFromSelection = () => {
    dispatch({ type: 'SET_CONTEXT_MODE', mode: 'create_pin' });
    dispatch({ type: 'SET_CONTEXT_OPEN', open: true });
  };

  const handleAskQuestion = () => {
    dispatch({ type: 'SET_CONTEXT_MODE', mode: 'create_question' });
    dispatch({ type: 'SET_CONTEXT_OPEN', open: true });
  };

  const handleAskAI = () => {
    dispatch({ type: 'SET_CONTEXT_MODE', mode: 'ai_tutor' });
    dispatch({ type: 'SET_CONTEXT_OPEN', open: true });
  };

  const handleSavePin = useCallback(
    async (data: {
      title: string;
      type: KnowledgePin['type'];
      note: string;
      anchorText: string;
      visibility: import('../services/socialService').ApiVisibility;
    }) => {
      if (!state.activeDocumentId || !state.selection) return;
      setSavingPin(true);
      try {
        const created = await createPin({
          title: data.title,
          content: data.note || data.anchorText,
          pin_type: PIN_TYPE_TO_API[data.type],
          visibility: data.visibility,
          page_number: state.selection.pageNumber,
          target_type: 'PARAGRAPH',
          target_id: null,
          selection_start_offset: state.selection.startOffset,
          selection_end_offset: state.selection.endOffset,
          selected_text_snapshot: state.selection.selectedText,
          location_metadata_json: state.selection.locationMetadata,
          document_id: state.activeDocumentId,
          document_version: state.selection.documentVersion,
        });
        const mapped = mapPinFromApi(created);
        setDocumentAnnotations((prev) => ({
          ...prev,
          [state.activeDocumentId!]: {
            pins: [...(prev[state.activeDocumentId!]?.pins ?? []), mapped],
            questions: prev[state.activeDocumentId!]?.questions ?? [],
          },
        }));
        clearSelection();
        dispatch({ type: 'SET_NOTES_TAB', tab: 'pins' });
        toast.success('Knowledge pin saved', { className: 'premium-shadow rounded-2xl border-none' });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save pin');
      } finally {
        setSavingPin(false);
      }
    },
    [state.activeDocumentId, state.selection, clearSelection, dispatch],
  );

  const handlePostQuestion = useCallback(
    async (data: {
      title: string;
      anchorText: string;
      content: string;
      visibility: import('../services/socialService').ApiVisibility;
    }) => {
      if (!state.activeDocumentId || !state.selection) return;
      setSavingQuestion(true);
      try {
        const created = await createLearningQuestion({
          title: data.title,
          content: data.content,
          visibility: data.visibility,
          page_number: state.selection.pageNumber,
          target_type: 'PARAGRAPH',
          target_id: null,
          selection_start_offset: state.selection.startOffset,
          selection_end_offset: state.selection.endOffset,
          selected_text_snapshot: state.selection.selectedText,
          location_metadata_json: state.selection.locationMetadata,
          document_id: state.activeDocumentId,
          document_version: state.selection.documentVersion,
        });
        const mapped = mapQuestionFromApi(created);
        setDocumentAnnotations((prev) => ({
          ...prev,
          [state.activeDocumentId!]: {
            pins: prev[state.activeDocumentId!]?.pins ?? [],
            questions: [...(prev[state.activeDocumentId!]?.questions ?? []), mapped],
          },
        }));
        clearSelection();
        dispatch({ type: 'SET_NOTES_TAB', tab: 'questions' });
        toast.success('Question posted', { className: 'premium-shadow rounded-2xl border-none' });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to post question');
      } finally {
        setSavingQuestion(false);
      }
    },
    [state.activeDocumentId, state.selection, clearSelection, dispatch],
  );

  const handleLocatePin = (pin: KnowledgePin) => {
    locateInDocument({ anchorText: pin.anchorText, type: 'pin' });
  };

  const handleLocateQuestion = (question: PublicQuestion) => {
    locateInDocument({ anchorText: question.anchorText, type: 'question' });
  };

  const handleOpenNote = () => {
    openSplitLearning();
  };

  const handleSubmit = () => {
    if (!state.practice || state.practice.selectedIndex === null || !practiceQuestion) return;
    submitAnswer({
      questionId: practiceQuestion.id,
      questionNumber: practiceQuestion.number,
      questionText: practiceQuestion.text,
      answeredAt: 'Just now',
      wasCorrect: state.practice.selectedIndex === practiceQuestion.correctIndex,
    });
  };

  const handleCloseSplit = () => {
    dispatch({ type: 'CLOSE_SPLIT' });
  };

  const explorerPanel = (
    <aside className="w-full h-full border-r border-stone-200/60 bg-white/80 backdrop-blur-sm">
      <CourseExplorer
        courseName={courseData?.name ?? 'Course'}
        folders={
          courseData?.folders ?? [
            { id: 'folder-notes', name: 'Notes', defaultOpen: true, items: [] },
            { id: 'folder-exams', name: 'Past Exams', defaultOpen: true, items: [] },
          ]
        }
        openFolders={state.openFolders}
        activeDocumentId={state.activeDocumentId}
        onToggleFolder={toggleFolder}
        onFileSelect={handleFileSelect}
      />
    </aside>
  );

  const contextPanel = (
    <aside className="w-full h-full border-l border-stone-200/60 bg-white/80 backdrop-blur-sm">
      <ContextPanel
        mode={state.contextMode}
        notesTab={state.notesTab}
        activeDocument={activeDocument}
        selection={state.selection}
        practiceQuestion={practiceQuestion}
        practiceSelectedIndex={state.practice?.selectedIndex ?? null}
        practiceSubmitted={state.practice?.submitted ?? false}
        onNotesTabChange={(tab) => dispatch({ type: 'SET_NOTES_TAB', tab })}
        onSelectAnswer={selectAnswer}
        onSubmitAnswer={handleSubmit}
        onOpenNote={handleOpenNote}
        onOpenChatHistory={() => dispatch({ type: 'SET_CHAT_HISTORY_OPEN', open: true })}
        onLocatePin={handleLocatePin}
        onLocateQuestion={handleLocateQuestion}
        onSetMode={(mode) => dispatch({ type: 'SET_CONTEXT_MODE', mode })}
        onSavePin={handleSavePin}
        onPostQuestion={handlePostQuestion}
        savingPin={savingPin}
        savingQuestion={savingQuestion}
      />
    </aside>
  );

  const documentPanel = loading ? (
    <div className="h-full flex items-center justify-center text-stone-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ) : error ? (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-rose-600 mb-4">{error}</p>
      <button
        onClick={() => void loadWorkspace()}
        className="px-6 py-3 bg-teal-700 text-white rounded-2xl font-bold text-sm"
      >
        Try again
      </button>
    </div>
  ) : (
    <DocumentViewer
      document={activeDocument}
      documents={courseData?.documents ?? {}}
      highlightSectionId={highlightSectionId}
      locateTarget={state.locateTarget}
      activeQuestionId={state.practice?.questionId ?? null}
      jumpToQuestionId={jumpToQuestionId}
      splitMode={state.splitMode}
      practiceQuestion={practiceQuestion}
      practiceSelectedIndex={state.practice?.selectedIndex ?? null}
      examHistory={state.examHistory}
      onTextSelect={selectText}
      onPinClick={() => {}}
      onQuestionClick={() => {}}
      onPracticeQuestion={startPractice}
      onSetSplitMode={setSplitMode}
      onCloseSplit={handleCloseSplit}
    />
  );

  const header = (
    <CourseHeader
      courseName={courseData?.name ?? 'Course'}
      documentName={activeDocument?.name}
      focusMode={state.focusMode}
      onToggleFocus={() => dispatch({ type: 'TOGGLE_FOCUS' })}
      onToggleExplorer={() => dispatch({ type: 'SET_EXPLORER_OPEN', open: !state.explorerOpen })}
      onToggleContext={() => dispatch({ type: 'SET_CONTEXT_OPEN', open: !state.contextOpen })}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );

  const isPdfActive =
    activeDocument?.fileUrl &&
    (activeDocument.fileType === 'PDF' || activeDocument.fileUrl.toLowerCase().includes('.pdf'));

  const floatingToolbar = (
    <FloatingSelectionToolbar
      selection={isPdfActive ? state.selection : null}
      onPin={handlePinFromSelection}
      onAskQuestion={handleAskQuestion}
      onAskAI={handleAskAI}
    />
  );

  return (
    <>
      <ChatHistoryDrawer
        open={state.chatHistoryOpen}
        onClose={() => dispatch({ type: 'SET_CHAT_HISTORY_OPEN', open: false })}
        conversations={MOCK_CHAT_HISTORY}
      />

      <div className="hidden md:block h-screen">
        <FocusModeLayout
          focusMode={state.focusMode}
          onExitFocus={() => dispatch({ type: 'SET_FOCUS', enabled: false })}
          header={header}
          explorer={
            state.explorerOpen && !state.focusMode ? (
              <div className="w-[20%] min-w-[220px] max-w-[280px] flex-shrink-0">{explorerPanel}</div>
            ) : null
          }
          document={documentPanel}
          context={
            state.contextOpen && !state.focusMode ? (
              <div className="w-[20%] min-w-[280px] max-w-[360px] flex-shrink-0">{contextPanel}</div>
            ) : null
          }
          floatingToolbar={floatingToolbar}
        />
      </div>

      <div className="md:hidden h-screen flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 min-h-0 relative">
          {state.mobileView === 'document' && documentPanel}
        </div>
        <nav className="flex-shrink-0 border-t border-stone-200 bg-white/90 backdrop-blur-xl">
          <div className="flex">
            {(['explorer', 'document', 'context'] as const).map((view) => (
              <button
                key={view}
                onClick={() => dispatch({ type: 'SET_MOBILE_VIEW', view })}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  state.mobileView === view ? 'text-teal-700 border-t-2 border-teal-600' : 'text-stone-400'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </nav>
        <AnimatePresence>
          {state.mobileView === 'explorer' && (
            <MobileOverlay onClose={() => dispatch({ type: 'SET_MOBILE_VIEW', view: 'document' })}>
              {explorerPanel}
            </MobileOverlay>
          )}
          {state.mobileView === 'context' && (
            <MobileOverlay onClose={() => dispatch({ type: 'SET_MOBILE_VIEW', view: 'document' })}>
              {contextPanel}
            </MobileOverlay>
          )}
        </AnimatePresence>
        {floatingToolbar}
      </div>
    </>
  );
};

const MobileOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-40 bg-black/20"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl premium-shadow overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-stone-200" />
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:bg-stone-100 z-10"
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </motion.div>
  </motion.div>
);

export default CourseWorkspace;
