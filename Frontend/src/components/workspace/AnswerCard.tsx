import React from 'react';
import { Check, X } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import QuestionIntelligenceCard from './QuestionIntelligenceCard';
import KnowledgePinCard from './KnowledgePinCard';
import QuestionDiscussion from './QuestionDiscussion';
import type { ExamQuestion } from '../../types/workspace';

interface AnswerCardProps {
  question: ExamQuestion;
  selectedIndex: number;
  onOpenNote: () => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ question, selectedIndex, onOpenNote }) => {
  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl p-4 border ${
          isCorrect
            ? 'bg-emerald-50/50 border-emerald-200/60'
            : 'bg-rose-50/50 border-rose-200/60'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {isCorrect ? (
            <Check className="w-5 h-5 text-emerald-600" />
          ) : (
            <X className="w-5 h-5 text-rose-600" />
          )}
          <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-stone-500 flex-shrink-0">Your answer:</span>
            <span className={`font-medium ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {String.fromCharCode(65 + selectedIndex)}. {question.choices[selectedIndex]}
            </span>
          </div>
          {!isCorrect && (
            <div className="flex items-start gap-2">
              <span className="text-stone-500 flex-shrink-0">Correct:</span>
              <span className="font-medium text-emerald-700">
                {String.fromCharCode(65 + question.correctIndex)}. {question.choices[question.correctIndex]}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Explanation</h4>
        <p className="text-sm text-stone-700 leading-relaxed">{question.explanation}</p>
      </div>

      <ConfidenceBadge
        level={question.confidence}
        noteTitle={question.noteReference?.title}
        onOpenNote={question.confidence !== 'low' ? onOpenNote : undefined}
      />

      <QuestionIntelligenceCard intelligence={question.intelligence} />

      {question.pins.length > 0 && (
        <CollapsibleSection title="Knowledge Pins" count={question.pins.length} defaultCollapsed>
          <div className="space-y-2">
            {question.pins.map((pin) => (
              <KnowledgePinCard key={pin.id} pin={pin} compact />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {question.publicQuestions.length > 0 && (
        <CollapsibleSection title="Public Questions" count={question.publicQuestions.length} defaultCollapsed>
          <div className="space-y-2">
            {question.publicQuestions.map((pq) => (
              <QuestionDiscussion
                key={pq.id}
                anchorText={pq.anchorText}
                content={pq.content}
                author={pq.author}
                likes={pq.likes}
                replies={pq.replies}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  count: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}> = ({ title, count, defaultCollapsed = false, children }) => {
  const [open, setOpen] = React.useState(!defaultCollapsed);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-xs font-bold text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors"
      >
        {title}
        <span className="text-stone-300">{count} · {open ? '−' : '+'}</span>
      </button>
      {open && children}
    </div>
  );
};

export default AnswerCard;
