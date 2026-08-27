import React, { useState } from 'react';
import { Check, X, ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfidenceBadge from './ConfidenceBadge';
import QuestionIntelligenceCard from './QuestionIntelligenceCard';
import KnowledgePinCard from './KnowledgePinCard';
import QuestionDiscussion from './QuestionDiscussion';
import PanelChipNav from './PanelChipNav';
import FollowUpChat from './FollowUpChat';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import type { ExamQuestion, PracticeFeedback, RelevantNote } from '../../types/workspace';

interface AnswerCardProps {
  question: ExamQuestion;
  selectedIndex: number;
  /** Real backend feedback (correct answer, AI explanation, relevant notes). */
  feedback?: PracticeFeedback | null;
  onOpenNote: () => void;
  onGoToNote?: (note: RelevantNote) => void;
  onOpenChatHistory: () => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  question,
  selectedIndex,
  feedback,
  onOpenNote,
  onGoToNote,
  onOpenChatHistory,
}) => {
  const [socialTab, setSocialTab] = useState<'pins' | 'questions'>('pins');
  const isCorrect = feedback ? feedback.isCorrect : selectedIndex === question.correctIndex;

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
                {feedback
                  ? `${feedback.correctChoiceLabel}. ${feedback.correctChoiceText}`
                  : `${String.fromCharCode(65 + question.correctIndex!)}. ${question.choices[question.correctIndex!]}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {(feedback?.aiExplanation || question.explanation) && (
        <div className="rounded-xl border border-stone-100 bg-gradient-to-b from-teal-50/30 to-white p-4">
          {feedback && (
            <>
              {feedback.explanationSource === 'COURSE_NOTES' ? (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-base">📚</span>
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
                    Based on your course notes
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200/70 px-3 py-2 mb-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">⚠️</span>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                      Not covered in your course notes
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    This explanation is based on general knowledge — this topic was not found in your uploaded notes.
                  </p>
                </div>
              )}
            </>
          )}
          {!feedback && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-base">✨</span>
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Explanation</h4>
            </div>
          )}
          <MarkdownRenderer content={feedback?.aiExplanation ?? question.explanation ?? ''} />
        </div>
      )}

      {feedback && feedback.explanationSource === 'COURSE_NOTES' && feedback.relevantNotes.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            Relevant Notes
          </h4>
          <div className="space-y-2">
            {feedback.relevantNotes.map((note) => (
              <button
                key={note.contentBlockId}
                onClick={() => onGoToNote?.(note)}
                className="w-full flex items-start justify-between gap-3 p-3 rounded-xl border border-stone-100 bg-white hover:bg-teal-50/40 hover:border-teal-200/60 transition-all text-left group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-700 truncate group-hover:text-teal-800">
                    {note.documentTitle}
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1">
                    {note.contentSnippet}
                  </p>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1.5">
                    Page {note.pageNumber}
                  </div>
                </div>
                <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-teal-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  Go to Note
                </span>
              </button>
            ))}
          </div>
        </div>
      )}


      {!feedback && question.confidence && (
        <ConfidenceBadge
          level={question.confidence}
          noteTitle={question.noteReference?.title}
          onOpenNote={question.confidence !== 'low' ? onOpenNote : undefined}
        />
      )}

      {!feedback && <QuestionIntelligenceCard intelligence={question.intelligence} />}

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
                  question={pq}
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
