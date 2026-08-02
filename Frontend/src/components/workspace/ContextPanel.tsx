import React from 'react';
import { Pin, HelpCircle, Sparkles, Bot, ChevronRight } from 'lucide-react';
import QuestionWorkspace from './QuestionWorkspace';
import AnswerCard from './AnswerCard';
import KnowledgePinCard from './KnowledgePinCard';
import QuestionDiscussion from './QuestionDiscussion';
import CommentThread from './CommentThread';
import SplitLearningView from './SplitLearningView';
import type {
  ContextPanelMode,
  CourseDocument,
  NoteDocument,
  PastExamDocument,
  KnowledgePin,
  PublicQuestion,
  ExamQuestion,
  SplitViewMode,
} from '../../types/workspace';

interface ContextPanelProps {
  mode: ContextPanelMode;
  activeDocument: CourseDocument | null;
  documents: Record<string, CourseDocument>;
  selectedPinId: string | null;
  selectedQuestionId: string | null;
  practiceQuestion: ExamQuestion | null;
  practiceSelectedIndex: number | null;
  practiceSubmitted: boolean;
  splitMode: SplitViewMode;
  highlightSectionId: string | null;
  onSelectAnswer: (index: number) => void;
  onSubmitAnswer: () => void;
  onOpenNote: () => void;
  onSetSplitMode: (mode: SplitViewMode) => void;
  onPinClick: (pinId: string) => void;
  onPublicQuestionClick: (questionId: string) => void;
  onSetMode: (mode: ContextPanelMode) => void;
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  mode,
  activeDocument,
  documents,
  selectedPinId,
  selectedQuestionId,
  practiceQuestion,
  practiceSelectedIndex,
  practiceSubmitted,
  splitMode,
  highlightSectionId,
  onSelectAnswer,
  onSubmitAnswer,
  onOpenNote,
  onSetSplitMode,
  onPinClick,
  onPublicQuestionClick,
  onSetMode,
}) => {
  if (splitMode === 'split' && practiceQuestion && practiceSubmitted) {
    const noteDoc = practiceQuestion.noteReference
      ? (documents[practiceQuestion.noteReference.documentId] as NoteDocument | undefined)
      : undefined;

    return (
      <SplitLearningView
        question={practiceQuestion}
        selectedIndex={practiceSelectedIndex ?? 0}
        noteDocument={noteDoc ?? null}
        highlightSectionId={highlightSectionId}
        splitMode={splitMode}
        onSetSplitMode={onSetSplitMode}
        onOpenNote={onOpenNote}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-stone-100 flex-shrink-0">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
          {getPanelTitle(mode)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {mode === 'guidance' && <GuidanceState />}
        {mode === 'notes_context' && activeDocument?.type === 'note' && (
          <NotesContextState
            document={activeDocument}
            onPinClick={onPinClick}
            onQuestionClick={onPublicQuestionClick}
            onSetMode={onSetMode}
          />
        )}
        {mode === 'pin_detail' && (
          <PinDetailState
            document={activeDocument}
            selectedPinId={selectedPinId}
            onPinClick={onPinClick}
          />
        )}
        {mode === 'question_detail' && (
          <QuestionDetailState
            document={activeDocument}
            selectedQuestionId={selectedQuestionId}
          />
        )}
        {mode === 'ai_tutor' && <AITutorState selection="" />}
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
          />
        )}
      </div>
    </div>
  );
};

function getPanelTitle(mode: ContextPanelMode): string {
  const titles: Record<ContextPanelMode, string> = {
    guidance: 'Study Guide',
    notes_context: 'Context',
    pin_detail: 'Knowledge Pin',
    question_detail: 'Discussion',
    ai_tutor: 'AI Tutor',
    practice: 'Practice',
    answered: 'Review',
  };
  return titles[mode];
}

const GuidanceState: React.FC = () => (
  <div className="space-y-6">
    <p className="text-sm text-stone-500 leading-relaxed">
      Welcome to your study workspace. Select a document to begin, or use these tools while reading.
    </p>
    <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
        Select text to:
      </p>
      <div className="space-y-3">
        <GuidanceItem icon={Pin} label="Create Knowledge Pin" color="text-amber-600" />
        <GuidanceItem icon={HelpCircle} label="Ask Question" color="text-sky-600" />
        <GuidanceItem icon={Sparkles} label="Ask AI" color="text-teal-600" />
      </div>
    </div>
    <p className="text-xs text-stone-400">
      Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono">F</kbd> for focus mode.
    </p>
  </div>
);

const GuidanceItem: React.FC<{ icon: React.ElementType; label: string; color: string }> = ({
  icon: Icon,
  label,
  color,
}) => (
  <div className="flex items-center gap-3">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-sm text-stone-700">{label}</span>
  </div>
);

const NotesContextState: React.FC<{
  document: NoteDocument;
  onPinClick: (pinId: string) => void;
  onQuestionClick: (questionId: string) => void;
  onSetMode: (mode: ContextPanelMode) => void;
}> = ({ document, onPinClick, onQuestionClick, onSetMode }) => (
  <div className="space-y-6">
    {document.pins.length > 0 && (
      <section>
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
          Knowledge Pins
        </h3>
        <div className="space-y-2">
          {document.pins.map((pin) => (
            <KnowledgePinCard key={pin.id} pin={pin} compact onClick={() => onPinClick(pin.id)} />
          ))}
        </div>
      </section>
    )}

    {document.questions.length > 0 && (
      <section>
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
          Questions
        </h3>
        <div className="space-y-2">
          {document.questions.map((q) => (
            <QuestionDiscussion
              key={q.id}
              anchorText={q.anchorText}
              content={q.content}
              author={q.author}
              likes={q.likes}
              replies={q.replies}
            />
          ))}
        </div>
      </section>
    )}

    <section>
      <button
        onClick={() => onSetMode('ai_tutor')}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-stone-100 bg-white hover:bg-stone-50/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
            <Bot className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-stone-800">AI Tutor</div>
            <div className="text-xs text-stone-500">Ask about this document</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
      </button>
    </section>
  </div>
);

const PinDetailState: React.FC<{
  document: CourseDocument | null;
  selectedPinId: string | null;
  onPinClick: (pinId: string) => void;
}> = ({ document, selectedPinId, onPinClick }) => {
  const pin = findPin(document, selectedPinId);
  if (!pin) return <p className="text-sm text-stone-500">Pin not found.</p>;

  return (
    <div className="space-y-4">
      <KnowledgePinCard pin={pin} isActive />
      {pin.replies.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Replies</h4>
          <CommentThread comments={pin.replies} />
        </div>
      )}
    </div>
  );
};

const QuestionDetailState: React.FC<{
  document: CourseDocument | null;
  selectedQuestionId: string | null;
}> = ({ document, selectedQuestionId }) => {
  const question = findPublicQuestion(document, selectedQuestionId);
  if (!question) return <p className="text-sm text-stone-500">Question not found.</p>;

  return (
    <QuestionDiscussion
      anchorText={question.anchorText}
      content={question.content}
      author={question.author}
      likes={question.likes}
      replies={question.replies}
      defaultExpanded
    />
  );
};

const AITutorState: React.FC<{ selection: string }> = ({ selection }) => (
  <div className="space-y-4">
    <div className="rounded-xl bg-teal-50/50 border border-teal-100 p-4">
      <p className="text-sm text-stone-700 leading-relaxed">
        {selection
          ? `I can help explain "${selection.slice(0, 80)}${selection.length > 80 ? '...' : ''}"`
          : 'Select text in the document or ask me anything about this topic.'}
      </p>
    </div>
    <div className="rounded-xl border border-stone-100 p-3">
      <input
        type="text"
        placeholder="Ask a question..."
        className="w-full text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
      />
    </div>
  </div>
);

function findPin(document: CourseDocument | null, pinId: string | null): KnowledgePin | null {
  if (!document || !pinId) return null;
  if (document.type === 'note') {
    return document.pins.find((p) => p.id === pinId) ?? null;
  }
  for (const q of document.questions) {
    const pin = q.pins.find((p) => p.id === pinId);
    if (pin) return pin;
  }
  return null;
}

function findPublicQuestion(
  document: CourseDocument | null,
  questionId: string | null,
): PublicQuestion | null {
  if (!document || !questionId) return null;
  if (document.type === 'note') {
    return document.questions.find((q) => q.id === questionId) ?? null;
  }
  for (const q of document.questions) {
    const pq = q.publicQuestions.find((p) => p.id === questionId);
    if (pq) return pq;
  }
  return null;
}

export default ContextPanel;
