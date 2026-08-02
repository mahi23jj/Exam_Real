import React, { useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Columns2, FileText, HelpCircle, X } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import type { ExamQuestion, NoteDocument, SplitViewMode } from '../../types/workspace';

interface SplitLearningViewProps {
  question: ExamQuestion;
  selectedIndex: number;
  noteDocument: NoteDocument | null;
  highlightSectionId: string | null;
  splitMode: SplitViewMode;
  onSetSplitMode: (mode: SplitViewMode) => void;
  onOpenNote: () => void;
}

const SplitLearningView: React.FC<SplitLearningViewProps> = ({
  question,
  selectedIndex,
  noteDocument,
  highlightSectionId,
  splitMode,
  onSetSplitMode,
}) => {
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightSectionId && noteRef.current) {
      const el = noteRef.current.querySelector(`#${highlightSectionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSectionId, noteDocument]);

  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1 flex-shrink-0">
        <ViewToggle
          icon={HelpCircle}
          label="Question"
          active={splitMode === 'question_only' || splitMode === 'split'}
          onClick={() => onSetSplitMode(splitMode === 'split' ? 'question_only' : 'split')}
        />
        <ViewToggle
          icon={FileText}
          label="Notes"
          active={splitMode === 'notes_only' || splitMode === 'split'}
          onClick={() => onSetSplitMode(splitMode === 'split' ? 'notes_only' : 'split')}
        />
        <ViewToggle
          icon={Columns2}
          label="Split"
          active={splitMode === 'split'}
          onClick={() => onSetSplitMode('split')}
        />
        <div className="flex-1" />
        <button
          onClick={() => onSetSplitMode('question_only')}
          className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          title="Close split view"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {splitMode === 'question_only' && (
          <QuestionPanel question={question} selectedIndex={selectedIndex} isCorrect={isCorrect} />
        )}
        {splitMode === 'notes_only' && noteDocument && (
          <NotePanel
            ref={noteRef}
            document={noteDocument}
            highlightSectionId={highlightSectionId}
            highlightText={question.noteReference?.highlightText}
          />
        )}
        {splitMode === 'split' && (
          <PanelGroup direction="vertical" className="h-full">
            <Panel defaultSize={45} minSize={25}>
              <QuestionPanel question={question} selectedIndex={selectedIndex} isCorrect={isCorrect} />
            </Panel>
            <PanelResizeHandle className="h-1 bg-stone-100 hover:bg-teal-200 transition-colors" />
            <Panel defaultSize={55} minSize={25}>
              {noteDocument ? (
                <NotePanel
                  ref={noteRef}
                  document={noteDocument}
                  highlightSectionId={highlightSectionId}
                  highlightText={question.noteReference?.highlightText}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-stone-500 p-4">
                  No supporting note available.
                </div>
              )}
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
};

const ViewToggle: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
      active ? 'bg-teal-50 text-teal-700' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
    }`}
  >
    <Icon className="w-3 h-3" />
    {label}
  </button>
);

const QuestionPanel: React.FC<{
  question: ExamQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}> = ({ question, selectedIndex, isCorrect }) => (
  <div className="h-full overflow-y-auto no-scrollbar p-4 space-y-4">
    <div>
      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
        Question {question.number}
      </div>
      <p className="text-sm font-medium text-stone-800 leading-relaxed">{question.text}</p>
    </div>

    <div
      className={`rounded-lg p-3 text-sm ${
        isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
      }`}
    >
      {isCorrect ? '✓ Correct' : '✗ Incorrect'} —{' '}
      {String.fromCharCode(65 + selectedIndex)}. {question.choices[selectedIndex]}
    </div>

    <div>
      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Explanation</h4>
      <p className="text-sm text-stone-700 leading-relaxed">{question.explanation}</p>
    </div>

    <ConfidenceBadge level={question.confidence} noteTitle={question.noteReference?.title} />
  </div>
);

const NotePanel = React.forwardRef<
  HTMLDivElement,
  {
    document: NoteDocument;
    highlightSectionId: string | null;
    highlightText?: string;
  }
>(({ document, highlightSectionId, highlightText }, ref) => (
  <div ref={ref} className="h-full overflow-y-auto no-scrollbar p-4 bg-stone-50/30">
    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
      {document.name}
    </div>
    {document.sections.map((section) => (
      <section
        key={section.id}
        id={section.id}
        className={`mb-6 scroll-mt-4 rounded-xl -mx-2 px-2 py-2 transition-colors ${
          highlightSectionId === section.id ? 'bg-teal-50/80 ring-1 ring-teal-200/50' : ''
        }`}
      >
        <h3 className="text-sm font-bold text-stone-800 mb-2 font-serif">{section.heading}</h3>
        {section.paragraphs.map((para, idx) => (
          <p key={idx} className="text-sm text-stone-600 leading-relaxed font-serif mb-2">
            {highlightText && para.includes(highlightText) ? (
              <>
                {para.split(highlightText)[0]}
                <mark className="bg-teal-200/60 text-stone-800 rounded px-0.5">{highlightText}</mark>
                {para.split(highlightText)[1]}
              </>
            ) : (
              para
            )}
          </p>
        ))}
      </section>
    ))}
  </div>
));

NotePanel.displayName = 'NotePanel';

export default SplitLearningView;
