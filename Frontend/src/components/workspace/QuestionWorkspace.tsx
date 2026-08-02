import React from 'react';
import { Send } from 'lucide-react';
import type { ExamQuestion } from '../../types/workspace';

interface QuestionWorkspaceProps {
  question: ExamQuestion;
  selectedIndex: number | null;
  submitted: boolean;
  onSelectAnswer: (index: number) => void;
  onSubmit: () => void;
}

const QuestionWorkspace: React.FC<QuestionWorkspaceProps> = ({
  question,
  selectedIndex,
  submitted,
  onSelectAnswer,
  onSubmit,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
          Question {question.number}
        </div>
        <p className="text-sm font-medium text-stone-800 leading-relaxed">{question.text}</p>
      </div>

      <div className="space-y-2">
        {question.choices.map((choice, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={idx}
              disabled={submitted}
              onClick={() => onSelectAnswer(idx)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left text-sm transition-all duration-200 ${
                isSelected
                  ? 'border-teal-300 bg-teal-50 text-teal-900 ring-1 ring-teal-200/60'
                  : 'border-stone-100 bg-white text-stone-700 hover:border-stone-200 hover:bg-stone-50/50'
              } ${submitted ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isSelected ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-relaxed">{choice}</span>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={onSubmit}
          disabled={selectedIndex === null}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-bold hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed premium-shadow"
        >
          <Send className="w-4 h-4" />
          Submit Answer
        </button>
      )}
    </div>
  );
};

export default QuestionWorkspace;
