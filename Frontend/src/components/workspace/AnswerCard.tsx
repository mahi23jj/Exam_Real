import React, { useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfidenceBadge from './ConfidenceBadge';
import QuestionIntelligenceCard from './QuestionIntelligenceCard';
import KnowledgePinCard from './KnowledgePinCard';
import QuestionDiscussion from './QuestionDiscussion';
import PanelChipNav from './PanelChipNav';
import FollowUpChat from './FollowUpChat';
import type { ExamQuestion } from '../../types/workspace';

interface AnswerCardProps {
  question: ExamQuestion;
  selectedIndex: number;
  onOpenNote: () => void;
  onOpenChatHistory: () => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  question,
  selectedIndex,
  onOpenNote,
  onOpenChatHistory,
}) => {
  const [socialTab, setSocialTab] = useState<'pins' | 'questions'>('pins');
  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div
        className={`rounded-xl p-4 border ${
          isCorrect ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-rose-50/50 border-rose-200/60'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {isCorrect ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-rose-600" />}
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
        <p className="text-[15px] text-stone-700 leading-relaxed">{question.explanation}</p>
      </div>

      <ConfidenceBadge
        level={question.confidence}
        noteTitle={question.noteReference?.title}
        onOpenNote={question.confidence !== 'low' ? onOpenNote : undefined}
      />

      <QuestionIntelligenceCard intelligence={question.intelligence} />

      {(question.pins.length > 0 || question.publicQuestions.length > 0) && (
        <div>
          <PanelChipNav
            chips={[
              { id: 'pins', label: 'Knowledge Pins', count: question.pins.length },
              { id: 'questions', label: 'Public Questions', count: question.publicQuestions.length },
            ]}
            activeId={socialTab}
            onSelect={(id) => setSocialTab(id as 'pins' | 'questions')}
            className="!px-0 !pt-0"
          />
          {socialTab === 'pins' && question.pins.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
              {question.pins.map((pin) => (
                <KnowledgePinCard key={pin.id} pin={pin} compact />
              ))}
            </motion.div>
          )}
          {socialTab === 'questions' && question.publicQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
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
            </motion.div>
          )}
        </div>
      )}

      <FollowUpChat questionText={question.text} />

      <button
        onClick={onOpenChatHistory}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:bg-stone-50 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm font-semibold text-teal-700"
      >
        Chat History
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default AnswerCard;
