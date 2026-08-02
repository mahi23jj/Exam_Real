import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

import { getWorkspaceData } from '../data/workspaceMockData';
import { useWorkspaceState } from '../hooks/useWorkspaceState';
import type { PastExamDocument, ExamQuestion } from '../types/workspace';

import CourseHeader from '../components/workspace/CourseHeader';
import CourseExplorer from '../components/workspace/CourseExplorer';
import DocumentViewer from '../components/workspace/DocumentViewer';
import ContextPanel from '../components/workspace/ContextPanel';
import FloatingSelectionToolbar from '../components/workspace/FloatingSelectionToolbar';
import FocusModeLayout from '../components/workspace/FocusModeLayout';

const CourseWorkspace: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const courseData = courseId ? getWorkspaceData(courseId) : null;

  const defaultOpenFolders = useMemo(
    () => courseData?.folders.filter((f) => f.defaultOpen).map((f) => f.id) ?? [],
    [courseData],
  );

  const initialDocId = 'note-memory-management';
  const initialDoc = courseData?.documents[initialDocId] ?? null;

  const {
    state,
    dispatch,
    openDocument,
    selectText,
    clearSelection,
    openPin,
    openPublicQuestion,
    startPractice,
    selectAnswer,
    submitAnswer,
    openSplitLearning,
    setSplitMode,
    toggleFolder,
  } = useWorkspaceState(initialDocId, initialDoc, defaultOpenFolders);

  const [searchQuery, setSearchQuery] = useState('');

  if (!courseData) {
    return <Navigate to="/" replace />;
  }

  const practiceQuestion: ExamQuestion | null = useMemo(() => {
    if (!state.practice || state.activeDocument?.type !== 'past_exam') return null;
    const exam = state.activeDocument as PastExamDocument;
    return exam.questions.find((q) => q.id === state.practice!.questionId) ?? null;
  }, [state.practice, state.activeDocument]);

  const highlightSectionId = useMemo(() => {
    if (state.splitMode === 'split' || state.contextMode === 'answered') {
      return practiceQuestion?.noteReference?.sectionId ?? null;
    }
    return null;
  }, [state.splitMode, state.contextMode, practiceQuestion]);

  const handleFileSelect = (documentId: string) => {
    const doc = courseData.documents[documentId];
    if (doc) openDocument(documentId, doc);
  };

  const handlePinFromSelection = () => {
    toast.success('Knowledge pin created', { className: 'premium-shadow rounded-2xl border-none' });
    clearSelection();
  };

  const handleAskQuestion = () => {
    toast.info('Question posted', { className: 'premium-shadow rounded-2xl border-none' });
    clearSelection();
  };

  const handleAskAI = () => {
    dispatch({ type: 'SET_CONTEXT_MODE', mode: 'ai_tutor' });
    dispatch({ type: 'SET_CONTEXT_OPEN', open: true });
    clearSelection();
  };

  const handleOpenNote = () => {
    openSplitLearning();
  };

  const handleSubmit = () => {
    if (state.practice?.selectedIndex === null) return;
    submitAnswer();
  };

  const explorerPanel = (
    <aside className="w-full h-full border-r border-stone-200/60 bg-white/80 backdrop-blur-sm">
      <CourseExplorer
        courseName={courseData.name}
        folders={courseData.folders}
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
        activeDocument={state.activeDocument}
        documents={courseData.documents}
        selectedPinId={state.selectedPinId}
        selectedQuestionId={state.selectedQuestionId}
        practiceQuestion={practiceQuestion}
        practiceSelectedIndex={state.practice?.selectedIndex ?? null}
        practiceSubmitted={state.practice?.submitted ?? false}
        splitMode={state.splitMode}
        highlightSectionId={highlightSectionId}
        onSelectAnswer={selectAnswer}
        onSubmitAnswer={handleSubmit}
        onOpenNote={handleOpenNote}
        onSetSplitMode={setSplitMode}
        onPinClick={openPin}
        onPublicQuestionClick={openPublicQuestion}
        onSetMode={(mode) => dispatch({ type: 'SET_CONTEXT_MODE', mode })}
      />
    </aside>
  );

  const documentPanel = (
    <DocumentViewer
      document={state.activeDocument}
      highlightSectionId={highlightSectionId}
      activeQuestionId={state.practice?.questionId ?? null}
      onTextSelect={selectText}
      onPinClick={openPin}
      onQuestionClick={openPublicQuestion}
      onPracticeQuestion={startPractice}
    />
  );

  const header = (
    <CourseHeader
      courseName={courseData.name}
      documentName={state.activeDocument?.name}
      focusMode={state.focusMode}
      onToggleFocus={() => dispatch({ type: 'TOGGLE_FOCUS' })}
      onToggleExplorer={() => dispatch({ type: 'SET_EXPLORER_OPEN', open: !state.explorerOpen })}
      onToggleContext={() => dispatch({ type: 'SET_CONTEXT_OPEN', open: !state.contextOpen })}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );

  const floatingToolbar = (
    <FloatingSelectionToolbar
      selection={state.activeDocument?.type === 'note' ? state.selection : null}
      onPin={handlePinFromSelection}
      onAskQuestion={handleAskQuestion}
      onAskAI={handleAskAI}
    />
  );

  return (
    <>
      {/* Desktop / Tablet layout */}
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

      {/* Mobile layout */}
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
                  state.mobileView === view
                    ? 'text-teal-700 border-t-2 border-teal-600'
                    : 'text-stone-400'
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
