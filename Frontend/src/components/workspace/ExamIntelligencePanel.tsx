import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PastExamDocument, ExamHistoryItem } from '../../types/workspace';

interface ExamIntelligencePanelProps {
  document: PastExamDocument;
  history: ExamHistoryItem[];
  onJumpToQuestion: (questionId: string) => void;
}

const ExamIntelligencePanel: React.FC<ExamIntelligencePanelProps> = ({
  document,
  history,
  onJumpToQuestion,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);

  const topicCounts = document.questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.intelligence.topic] = (acc[q.intelligence.topic] || 0) + q.intelligence.mostAskedCount;
    return acc;
  }, {});

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCount = topTopics[0]?.[1] ?? 1;

  return (
    <div className="mb-8 rounded-2xl border border-stone-100 bg-white p-5 premium-shadow">
      <h3 className="text-sm font-semibold text-stone-800 mb-4">Exam Intelligence</h3>

      <div className="space-y-3 mb-5">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Top Topics</p>
        {topTopics.map(([topic, count]) => (
          <div key={topic}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-stone-700">{topic}</span>
              <span className="text-xs font-semibold text-stone-500">{count}</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-teal-700 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-stone-50 pt-4">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between text-sm font-semibold text-stone-700 hover:text-teal-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-400" />
            History
          </span>
          {historyOpen ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-stone-400 py-2">No practice history yet.</p>
                ) : (
                  history.map((item) => (
                    <button
                      key={`${item.questionId}-${item.answeredAt}`}
                      onClick={() => onJumpToQuestion(item.questionId)}
                      className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-all hover:-translate-y-0.5 hover:premium-shadow text-sm"
                    >
                      <span className="font-medium text-stone-800">
                        Question {item.questionNumber}:
                      </span>{' '}
                      <span className="text-stone-600">{item.questionText.slice(0, 40)}...</span>
                      <span className="block text-xs text-stone-400 mt-1">
                        {item.wasCorrect ? '✓ Correct' : '✗ Incorrect'} · {item.answeredAt}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExamIntelligencePanel;
