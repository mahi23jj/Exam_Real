import React from 'react';
import type { ExamQuestion } from '../../types/workspace';

interface QuestionIntelligenceCardProps {
  intelligence: ExamQuestion['intelligence'];
}

const QuestionIntelligenceCard: React.FC<QuestionIntelligenceCardProps> = ({ intelligence }) => {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
        Question Intelligence
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">Topic</span>
          <span className="text-sm font-semibold text-stone-800">{intelligence.topic}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">Appeared</span>
          <span className="text-sm font-semibold text-stone-800">
            {intelligence.mostAskedCount} times
          </span>
        </div>

        <div>
          <span className="text-xs text-stone-500 block mb-2">Years</span>
          <div className="flex flex-wrap gap-1.5">
            {intelligence.yearsAppeared.map((year) => (
              <span
                key={year}
                className="px-2 py-0.5 bg-white rounded-lg text-xs font-semibold text-stone-600 border border-stone-100"
              >
                {year}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionIntelligenceCard;
