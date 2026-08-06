import React, { useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { X, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfidenceBadge from './ConfidenceBadge';
import PanelChipNav from './PanelChipNav';
import KnowledgePinCard from './KnowledgePinCard';
import type { ExamQuestion, NoteDocument, SplitViewMode } from '../../types/workspace';

interface SplitLearningCenterProps {
  question: ExamQuestion;
  selectedIndex: number;
  noteDocument: NoteDocument | null;
  highlightSectionId: string | null;
  splitMode: SplitViewMode;
  onSetSplitMode: (mode: SplitViewMode) => void;
  onCloseSplit: () => void;
}

const SplitLearningCenter: React.FC<SplitLearningCenterProps> = ({
  question,
  selectedIndex,
  noteDocument,
  highlightSectionId,
  splitMode,
  onSetSplitMode,
  onCloseSplit,
}) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const isCorrect = selectedIndex === question.correctIndex;
  const highlightText = question.noteReference?.highlightText;

  useEffect(() => {
    if (highlightSectionId && noteRef.current) {
      const el = noteRef.current.querySelector(`#${highlightSectionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSectionId, noteDocument]);

  const questionSize = splitMode === 'expanded_note' ? 30 : 50;
  const noteSize = splitMode === 'expanded_note' ? 70 : 50;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-full flex flex-col bg-white/60"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 flex-shrink-0">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Split Learning</span>
        <div className="flex-1" />
        {noteDocument && (
          <button
            onClick={() =>
              onSetSplitMode(splitMode === 'expanded_note' ? 'split' : 'expanded_note')
            }
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-stone-500 hover:bg-stone-100 uppercase tracking-wider transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            {splitMode === 'expanded_note' ? 'Reset Split' : 'Expand Note Panel'}
          </button>
        )}
        <button
          onClick={onCloseSplit}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-stone-500 hover:bg-stone-100 uppercase tracking-wider transition-colors"
        >
          <X className="w-3 h-3" />
          Close Note Panel
        </button>
      </div>

      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={questionSize} minSize={25}>
          <QuestionSide
            question={question}
            selectedIndex={selectedIndex}
            isCorrect={isCorrect}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-stone-100 hover:bg-teal-200 transition-colors" />
        <Panel defaultSize={noteSize} minSize={25}>
          {noteDocument ? (
            <NoteSide
              ref={noteRef}
              document={noteDocument}
              highlightSectionId={highlightSectionId}
              highlightText={highlightText}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-stone-500">
              No supporting note available.
            </div>
          )}
        </Panel>
      </PanelGroup>
    </motion.div>
  );
};

const QuestionSide: React.FC<{
  question: ExamQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}> = ({ question, selectedIndex, isCorrect }) => {
  const [socialTab, setSocialTab] = React.useState<'pins' | 'questions'>('pins');

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-4 border-r border-stone-100">
      <div>
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
          Question {question.number}
        </div>
        <p className="text-sm font-medium text-stone-800 leading-relaxed">{question.text}</p>
      </div>

      <div className={`rounded-xl p-3 text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
        {isCorrect ? '✓ Correct' : '✗ Incorrect'} — {String.fromCharCode(65 + selectedIndex)}. {question.choices[selectedIndex]}
      </div>

      <div>
        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Explanation</h4>
        <p className="text-sm text-stone-700 leading-relaxed">{question.explanation}</p>
      </div>

      <ConfidenceBadge level={question.confidence} noteTitle={question.noteReference?.title} />

      <PanelChipNav
        chips={[
          { id: 'pins', label: 'Knowledge Pins', count: question.pins.length },
          { id: 'questions', label: 'Public Questions', count: question.publicQuestions.length },
        ]}
        activeId={socialTab}
        onSelect={(id) => setSocialTab(id as 'pins' | 'questions')}
        className="!p-0"
      />

      {socialTab === 'pins' && question.pins.length > 0 && (
        <div className="space-y-2">
          {question.pins.map((pin) => (
            <KnowledgePinCard key={pin.id} pin={pin} compact />
          ))}
        </div>
      )}
      {socialTab === 'questions' && question.publicQuestions.length > 0 && (
        <div className="space-y-2">
          {question.publicQuestions.map((pq) => (
            <div key={pq.id} className="p-3 rounded-xl border border-stone-100 text-sm">
              <p className="text-stone-700">{pq.content}</p>
              <p className="text-xs text-stone-400 mt-1">{pq.author.name} · {pq.replies.length} replies</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NoteSide = React.forwardRef<
  HTMLDivElement,
  { document: NoteDocument; highlightSectionId: string | null; highlightText?: string }
>(({ document, highlightSectionId, highlightText }, ref) => (
  <div ref={ref} className="h-full overflow-y-auto no-scrollbar p-6 bg-stone-50/30">
    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">
      {document.name}
    </div>
    {document.sections.map((section) => (
      <section
        key={section.id}
        id={section.id}
        className={`mb-6 scroll-mt-4 rounded-xl -mx-2 px-2 py-2 ${
          highlightSectionId === section.id ? 'ring-1 ring-teal-200/50' : ''
        }`}
      >
        <h3 className="text-sm font-bold text-stone-800 mb-2 font-serif">{section.heading}</h3>
        {section.paragraphs.map((para, idx) => (
          <p key={idx} className="text-[15px] text-stone-600 leading-[1.6] font-serif mb-2">
            {highlightText && para.includes(highlightText) ? (
              <>
                {para.split(highlightText)[0]}
                <mark className="locate-highlight text-stone-800">{highlightText}</mark>
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

NoteSide.displayName = 'NoteSide';

export default SplitLearningCenter;
