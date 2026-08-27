import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ExamQuestion } from '../../types/workspace';
import type { ApiConfidenceLevel } from '../../services/examService';

const CONFIDENCE_OPTIONS: { value: ApiConfidenceLevel; label: string }[] = [
  { value: 'CONFIDENT', label: 'Confident' },
  { value: 'UNSURE', label: 'Unsure' },
  { value: 'GUESS', label: 'Guess' },
];

interface QuestionWorkspaceProps {
  question: ExamQuestion;
  selectedIndex: number | null;
  submitted: boolean;
  submitting?: boolean;
  onSelectAnswer: (index: number) => void;
  onSubmit: (confidence: ApiConfidenceLevel) => void;
}

const QuestionWorkspace: React.FC<QuestionWorkspaceProps> = ({
  question,
  selectedIndex,
  submitted,
  submitting = false,
  onSelectAnswer,
  onSubmit,
}) => {
  const [confidence, setConfidence] = useState<ApiConfidenceLevel>('CONFIDENT');

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
        <>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              How confident are you?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CONFIDENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setConfidence(option.value)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    confidence === option.value
                      ? 'border-teal-300 bg-teal-50 text-teal-800 ring-1 ring-teal-200/60'
                      : 'border-stone-100 bg-white text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSubmit(confidence)}
            disabled={selectedIndex === null || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-bold hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed premium-shadow"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
            ) : (
              <><Send className="w-4 h-4" />Submit Answer</>
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default QuestionWorkspace;
