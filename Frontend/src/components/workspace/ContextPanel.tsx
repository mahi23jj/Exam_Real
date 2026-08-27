import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Check, X } from 'lucide-react';
import { Shimmer, ShimmerText } from '../ui/Shimmer';
import QuestionWorkspace from './QuestionWorkspace';
import AnswerCard from './AnswerCard';
import NotesContextPanel from './NotesContextPanel';
import CreatePinPanel from './CreatePinPanel';
import CreateQuestionPanel from './CreateQuestionPanel';
import AITutorChat from './AITutorChat';
import type {
  ContextPanelMode,
  CourseDocument,
  NoteDocument,
  KnowledgePin,
  PublicQuestion,
  ExamQuestion,
  ExamHistoryItem,
  NotesChipTab,
  DocumentSelection,
} from '../../types/workspace';
import type { ApiVisibility } from '../../services/socialService';
import type { ApiConfidenceLevel } from '../../services/examService';
import type { BackendUser } from '../../services/authService';

interface ContextPanelProps {
  mode: ContextPanelMode;
  notesTab: NotesChipTab;
  activeDocument: CourseDocument | null;
  selection: DocumentSelection | null;
  practiceQuestion: ExamQuestion | null;
  practiceSelectedIndex: number | null;
  practiceSubmitted: boolean;
  practiceFeedback?: import('../../types/workspace').PracticeFeedback | null;
  practiceSubmitting?: boolean;
  examHistory?: ExamHistoryItem[];
  /** All exam questions for the active past-exam — used to render Q-number chips. */
  allExamQuestions?: ExamQuestion[];
  /** Called when the user clicks a question chip; should trigger startPractice. */
  onSelectQuestion?: (questionId: string) => void;
  onNotesTabChange: (tab: NotesChipTab) => void;
  onSelectAnswer: (index: number) => void;
  onSubmitAnswer: (confidence: ApiConfidenceLevel) => void;
  onOpenNote: () => void;
  onGoToNote?: (note: import('../../types/workspace').RelevantNote) => void;
  onOpenChatHistory: () => void;
  onLocatePin: (pin: KnowledgePin) => void;
  onLocateQuestion: (question: PublicQuestion) => void;
  onSetMode: (mode: ContextPanelMode) => void;
  /** Whether the past-exam question list is being loaded from the API. */
  isLoadingQuestions?: boolean;
  /** Whether the answer submission is in-flight. */
  isSubmitting?: boolean;
  onSavePin: (data: {
    title: string;
    type: KnowledgePin['type'];
    note: string;
    anchorText: string;
    visibility: ApiVisibility;
  }) => void;
  onPostQuestion: (data: {
    title: string;
    anchorText: string;
    content: string;
    visibility: ApiVisibility;
  }) => void;
  savingPin?: boolean;
  savingQuestion?: boolean;
  currentUser?: BackendUser | null;
  onPinMutate?: (pin: KnowledgePin | { id: string; deleted: boolean }) => void;
  onQuestionMutate?: (q: PublicQuestion | { id: string; deleted: boolean }) => void;
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  mode,
  notesTab,
  activeDocument,
  selection,
  practiceQuestion,
  practiceSelectedIndex,
  practiceSubmitted,
  practiceFeedback = null,
  practiceSubmitting = false,
  examHistory = [],
  allExamQuestions = [],
  onSelectQuestion,
  onNotesTabChange,
  onSelectAnswer,
  onSubmitAnswer,
  onOpenNote,
  onGoToNote,
  onOpenChatHistory,
  onLocatePin,
  onLocateQuestion,
  onSetMode,
  onSavePin,
  onPostQuestion,
  savingPin = false,
  savingQuestion = false,
  currentUser,
  onPinMutate,
  onQuestionMutate,
  isLoadingQuestions = false,
  isSubmitting = false,
}) => {
  const title = getPanelTitle(mode, activeDocument);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-stone-100 flex-shrink-0 flex items-center justify-between">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{title}</div>
        {activeDocument?.type === 'past_exam' && mode !== 'answer_history' && (
          <button
            onClick={() => onSetMode('answer_history')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 hover:bg-stone-100 hover:text-teal-700 transition-colors"
            title="Your previous attempts for this past exam"
          >
            <History className="w-3.5 h-3.5" />
            History
            {examHistory.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px]">
                {examHistory.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Question-number chip strip for Past Exam documents */}
      {activeDocument?.type === 'past_exam' &&
        (mode === 'practice' || mode === 'answered' || mode === 'guidance') && (
        <div className="flex-shrink-0 border-b border-stone-100 bg-stone-50/60">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
            {isLoadingQuestions ? (
              // Shimmer chips while questions are fetching
              Array.from({ length: 8 }).map((_, i) => (
                <Shimmer key={i} className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50" />
              ))
            ) : allExamQuestions.length > 0 ? (
              allExamQuestions.map((q) => {
                const isActive = practiceQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => onSelectQuestion?.(q.id)}
                    title={`Practice Question ${q.number}`}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                        : 'bg-white text-stone-500 border border-stone-200 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {q.number}
                  </button>
                );
              })
            ) : null}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {mode === 'guidance' && <GuidanceState documentType={activeDocument?.type} />}
            {mode === 'answer_history' && (
              <AnswerHistoryList
                history={examHistory}
                isLoading={isLoadingQuestions}
                onBack={() => onSetMode('guidance')}
                onPractice={(questionId) => onSetMode('practice')}
                activeQuestionId={practiceQuestion?.id ?? null}
              />
            )}
            {mode === 'notes_context' && activeDocument?.type === 'note' && (
              <NotesContextPanel
                document={activeDocument}
                activeTab={notesTab}
                onTabChange={onNotesTabChange}
                onLocatePin={onLocatePin}
                onLocateQuestion={onLocateQuestion}
                pins={activeDocument.pins}
                questions={activeDocument.questions}
                onCreatePin={() => onSetMode('create_pin')}
                onCreateQuestion={() => onSetMode('create_question')}
                currentUser={currentUser}
                onPinMutate={onPinMutate}
                onQuestionMutate={onQuestionMutate}
              />
            )}
            {mode === 'create_pin' && selection && (
              <CreatePinPanel
                selectedText={selection.selectedText}
                onCancel={() => onSetMode(activeDocument?.type === 'past_exam' ? 'guidance' : 'notes_context')}
                onSave={(data) => {
                  onSavePin(data);
                  onSetMode(activeDocument?.type === 'past_exam' ? 'guidance' : 'notes_context');
                }}
                saving={savingPin}
              />
            )}
            {mode === 'create_question' && selection && (
              <CreateQuestionPanel
                selectedText={selection.selectedText}
                onCancel={() => onSetMode(activeDocument?.type === 'past_exam' ? 'guidance' : 'notes_context')}
                onPost={(data) => {
                  onPostQuestion(data);
                  onSetMode(activeDocument?.type === 'past_exam' ? 'guidance' : 'notes_context');
                }}
                saving={savingQuestion}
              />
            )}
            {mode === 'ai_tutor' && selection && (
              <AITutorChat
                contextText={selection.selectedText}
                onBack={() => onSetMode('notes_context')}
              />
            )}
            {mode === 'practice' && practiceQuestion && (
              <>
                {isSubmitting ? (
                  // Explanation skeleton while waiting for the API
                  <div className="space-y-4 animate-pulse">
                    <div className="rounded-xl p-4 bg-teal-50/40 border border-teal-100 space-y-3">
                      <ShimmerText className="w-1/2 bg-teal-100/60" />
                      <ShimmerText className="w-full bg-teal-100/60" />
                      <ShimmerText className="w-5/6 bg-teal-100/60" />
                      <ShimmerText className="w-3/4 bg-teal-100/60" />
                    </div>
                    <div className="space-y-2">
                      <ShimmerText className="w-full bg-stone-100" />
                      <ShimmerText className="w-5/6 bg-stone-100" />
                      <ShimmerText className="w-4/5 bg-stone-100" />
                    </div>
                    <p className="text-xs text-center text-stone-400 font-medium animate-pulse">Checking your answer…</p>
                  </div>
                ) : (
                  <QuestionWorkspace
                    question={practiceQuestion}
                    selectedIndex={practiceSelectedIndex}
                    submitted={practiceSubmitted}
                    submitting={isSubmitting}
                    onSelectAnswer={onSelectAnswer}
                    onSubmit={onSubmitAnswer}
                  />
                )}
              </>
            )}
            {mode === 'answered' && practiceQuestion && practiceSelectedIndex !== null && (
              <AnswerCard
                question={practiceQuestion}
                selectedIndex={practiceSelectedIndex}
                feedback={practiceFeedback}
                onOpenNote={onOpenNote}
                onGoToNote={onGoToNote}
                onOpenChatHistory={onOpenChatHistory}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const AnswerHistoryList: React.FC<{
  history: ExamHistoryItem[];
  isLoading?: boolean;
  onBack: () => void;
  onPractice: (questionId: string) => void;
  activeQuestionId: string | null;
}> = ({ history, isLoading = false, onBack }) => (
  <div className="space-y-3">
    {isLoading ? (
      // History shimmer
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 border border-stone-100 space-y-2">
            <div className="flex items-center gap-2">
              <ShimmerText className="w-4 h-4 rounded-full bg-stone-100" />
              <ShimmerText className="w-24 bg-stone-100" />
              <ShimmerText className="w-16 ml-auto bg-stone-100" />
            </div>
            <ShimmerText className="w-full bg-stone-100" />
            <ShimmerText className="w-5/6 bg-stone-100" />
          </div>
        ))}
      </>
    ) : history.length === 0 ? (
      <p className="text-sm text-stone-500 leading-relaxed">
        No attempts yet. Practice a question and your results will appear here.
      </p>
    ) : (
      history.map((item) => (
        <div
          key={item.studentAnswerId ?? `${item.questionId}-${item.answeredAt}`}
          className={`rounded-xl p-4 border ${
            item.wasCorrect ? 'border-emerald-200/60 bg-emerald-50/40' : 'border-rose-200/60 bg-rose-50/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {item.wasCorrect ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-rose-600" />
            )}
            <span className="text-xs font-bold text-stone-600 uppercase tracking-widest">
              Question {item.questionNumber}
            </span>
            <span className="ml-auto text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              {item.answeredAt}
            </span>
          </div>
          <p className="text-sm font-medium text-stone-800 leading-relaxed line-clamp-2">{item.questionText}</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-stone-500">
              Your answer:{' '}
              <span className={`font-semibold ${item.wasCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                {item.selectedLabel ? `${item.selectedLabel}. ` : ''}
                {item.selectedText ?? '—'}
              </span>
            </p>
            {!item.wasCorrect && item.correctLabel && (
              <p className="text-stone-500">
                Correct:{' '}
                <span className="font-semibold text-emerald-700">
                  {item.correctLabel}. {item.correctText}
                </span>
              </p>
            )}
            {item.aiExplanation && (
              <p className="text-stone-600 leading-relaxed pt-1 border-t border-stone-100 mt-2">
                {item.aiExplanation}
              </p>
            )}
          </div>
        </div>
      ))
    )}
    <button
      onClick={onBack}
      className="w-full py-2.5 rounded-xl border border-stone-100 hover:bg-stone-50 text-sm font-semibold text-teal-700 transition-colors"
    >
      Back
    </button>
  </div>
);

function getPanelTitle(mode: ContextPanelMode, document: CourseDocument | null): string {
  const titles: Record<ContextPanelMode, string> = {
    guidance: 'Study Guide',
    notes_context: 'Context',
    pin_detail: 'Knowledge Pin',
    question_detail: 'Discussion',
    ai_tutor: 'Ask AI',
    practice: 'Practice',
    answered: 'Review',
    answer_history: 'Answer History',
    create_pin: 'Create Pin',
    create_question: 'Ask Question',
  };
  if (mode === 'notes_context' && document?.type === 'note') return 'Notes';
  return titles[mode] ?? 'Context';
}

const GuidanceState: React.FC<{ documentType?: string }> = ({ documentType }) => {
  if (documentType === 'past_exam') {
    return (
      <div className="space-y-5">
        <p className="text-[15px] text-stone-500 leading-relaxed">
          Select a question number above to start practising.
        </p>
        <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">How it works</p>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>• Click any <span className="font-semibold text-teal-700">[Q#]</span> chip above to open a question</li>
            <li>• Select your answer and submit</li>
            <li>• Get an AI explanation with relevant note references</li>
            <li>• Click a relevant note to open it side-by-side</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-stone-500 leading-relaxed">
        Welcome to your study workspace. Select a document from the explorer to begin.
      </p>
      <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Getting started</p>
        <ul className="space-y-2 text-sm text-stone-600">
          <li>• Open a note to read and annotate</li>
          <li>• Select text for pins, questions, or AI help</li>
          <li>• Practice past exam questions interactively</li>
        </ul>
      </div>
    </div>
  );
};

export default ContextPanel;
