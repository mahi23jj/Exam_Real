import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PastExamDocument, ExamQuestion } from '../../types/workspace';

interface PastExamViewerProps {
  document: PastExamDocument;
  onPracticeQuestion: (questionId: string) => void;
  activeQuestionId?: string | null;
}

const PastExamViewer: React.FC<PastExamViewerProps> = ({
  document,
  onPracticeQuestion,
  activeQuestionId,
}) => {
  const [hoveredQuestionId, setHoveredQuestionId] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-8 lg:px-12 py-10 lg:py-14">
      <div className="mb-10 pb-6 border-b border-stone-100">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Past Exam</div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold text-stone-800">{document.name}</h1>
        <p className="mt-4 text-sm text-stone-500 leading-relaxed">{document.intro}</p>
      </div>

      <div className="space-y-8">
        {document.questions.map((question) => (
          <ExamQuestionBlock
            key={question.id}
            question={question}
            isHovered={hoveredQuestionId === question.id}
            isActive={activeQuestionId === question.id}
            onHover={(hovered) => setHoveredQuestionId(hovered ? question.id : null)}
            onPractice={() => onPracticeQuestion(question.id)}
          />
        ))}
      </div>
    </div>
  );
};

const ExamQuestionBlock: React.FC<{
  question: ExamQuestion;
  isHovered: boolean;
  isActive: boolean;
  onHover: (hovered: boolean) => void;
  onPractice: () => void;
}> = ({ question, isHovered, isActive, onHover, onPractice }) => (
  <div
    className={`relative rounded-2xl p-6 transition-all duration-300 ${
      isActive
        ? 'bg-teal-50/50 ring-1 ring-teal-200/60'
        : 'bg-white hover:bg-stone-50/80'
    }`}
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
  >
    <div className="flex items-start gap-4">
      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600">
        {question.number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-stone-800 leading-relaxed mb-4">{question.text}</p>
        <ol className="space-y-2">
          {question.choices.map((choice, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm text-stone-600 leading-relaxed"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-xs font-bold text-stone-500">
                {String.fromCharCode(65 + idx)}
              </span>
              {choice}
            </li>
          ))}
        </ol>
      </div>
    </div>

    <AnimatePresence>
      {isHovered && !isActive && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="absolute top-4 right-4"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPractice();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors premium-shadow"
          >
            <Play className="w-3 h-3 fill-current" />
            Practice Question
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default PastExamViewer;
