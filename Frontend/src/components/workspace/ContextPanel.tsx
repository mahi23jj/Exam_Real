import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  NotesChipTab,
  TextSelection,
} from '../../types/workspace';

interface ContextPanelProps {
  mode: ContextPanelMode;
  notesTab: NotesChipTab;
  activeDocument: CourseDocument | null;
  selection: TextSelection | null;
  practiceQuestion: ExamQuestion | null;
  practiceSelectedIndex: number | null;
  practiceSubmitted: boolean;
  onNotesTabChange: (tab: NotesChipTab) => void;
  onSelectAnswer: (index: number) => void;
  onSubmitAnswer: () => void;
  onOpenNote: () => void;
  onOpenChatHistory: () => void;
  onLocatePin: (pin: KnowledgePin) => void;
  onLocateQuestion: (question: PublicQuestion) => void;
  onSetMode: (mode: ContextPanelMode) => void;
  onSavePin: (data: { type: KnowledgePin['type']; note: string; anchorText: string }) => void;
  onPostQuestion: (data: { anchorText: string; content: string }) => void;
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  mode,
  notesTab,
  activeDocument,
  selection,
  practiceQuestion,
  practiceSelectedIndex,
  practiceSubmitted,
  onNotesTabChange,
  onSelectAnswer,
  onSubmitAnswer,
  onOpenNote,
  onOpenChatHistory,
  onLocatePin,
  onLocateQuestion,
  onSetMode,
  onSavePin,
  onPostQuestion,
}) => {
  const title = getPanelTitle(mode, activeDocument);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-stone-100 flex-shrink-0">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{title}</div>
      </div>

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
            {mode === 'guidance' && <GuidanceState />}
            {mode === 'notes_context' && activeDocument?.type === 'note' && (
              <NotesContextPanel
                document={activeDocument}
                activeTab={notesTab}
                onTabChange={onNotesTabChange}
                onLocatePin={onLocatePin}
                onLocateQuestion={onLocateQuestion}
              />
            )}
            {mode === 'create_pin' && selection && (
              <CreatePinPanel
                selectedText={selection.text}
                onCancel={() => onSetMode('notes_context')}
                onSave={(data) => {
                  onSavePin(data);
                  onSetMode('notes_context');
                }}
              />
            )}
            {mode === 'create_question' && selection && (
              <CreateQuestionPanel
                selectedText={selection.text}
                onCancel={() => onSetMode('notes_context')}
                onPost={(data) => {
                  onPostQuestion(data);
                  onSetMode('notes_context');
                }}
              />
            )}
            {mode === 'ai_tutor' && selection && (
              <AITutorChat
                contextText={selection.text}
                onBack={() => onSetMode('notes_context')}
              />
            )}
            {mode === 'practice' && practiceQuestion && (
              <QuestionWorkspace
                question={practiceQuestion}
                selectedIndex={practiceSelectedIndex}
                submitted={practiceSubmitted}
                onSelectAnswer={onSelectAnswer}
                onSubmit={onSubmitAnswer}
              />
            )}
            {mode === 'answered' && practiceQuestion && practiceSelectedIndex !== null && (
              <AnswerCard
                question={practiceQuestion}
                selectedIndex={practiceSelectedIndex}
                onOpenNote={onOpenNote}
                onOpenChatHistory={onOpenChatHistory}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

function getPanelTitle(mode: ContextPanelMode, document: CourseDocument | null): string {
  const titles: Record<ContextPanelMode, string> = {
    guidance: 'Study Guide',
    notes_context: 'Context',
    pin_detail: 'Knowledge Pin',
    question_detail: 'Discussion',
    ai_tutor: 'Ask AI',
    practice: 'Practice',
    answered: 'Review',
    create_pin: 'Create Pin',
    create_question: 'Ask Question',
  };
  if (mode === 'notes_context' && document?.type === 'note') return 'Notes';
  return titles[mode] ?? 'Context';
}

const GuidanceState: React.FC = () => (
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

export default ContextPanel;
