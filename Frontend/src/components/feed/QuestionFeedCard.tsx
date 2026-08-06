import React from 'react';
import { motion } from 'framer-motion';
import type { FeedQuestion } from './feedTypes';
import RecommendationBadge from './RecommendationBadge';
import FeedActions from './FeedActions';

interface QuestionFeedCardProps {
  question: FeedQuestion;
  onOpenContext?: () => void;
}

const QuestionFeedCard: React.FC<QuestionFeedCardProps> = ({ question, onOpenContext }) => {
  const initials = question.author.initials;

  const sourceLabel = `${question.course} • Discussion`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.24 }}
      onClick={onOpenContext}
      className="group relative flex h-[clamp(600px,72vh,750px)] w-full max-w-[840px] cursor-pointer overflow-hidden rounded-[28px] border border-teal-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] shadow-[0_0_0_1px_rgba(20,184,166,0.08),0_22px_50px_rgba(15,118,110,0.08)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(20,184,166,0.14),0_26px_58px_rgba(15,118,110,0.12)]"
      aria-label={`Question: ${question.content.slice(0, 60)}…`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.1),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.06),transparent_30%)]" />
      <div className="relative grid h-full w-full grid-cols-[minmax(0,1fr)_80px] gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_84px] md:px-6 md:py-5 lg:grid-cols-[minmax(0,1fr)_88px] lg:px-7 lg:py-6">
        <div className="flex h-full min-w-0 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-[700px] flex-col gap-3 md:gap-3.5">
            <RecommendationBadge reason={question.recommendation} />

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700">
                <span>❓</span>
                <span>Question</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-stone-500">
                <span>{question.course}</span>
                <span className="text-stone-300">·</span>
                <span>{question.topic}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-stone-400">
                <span>📝</span>
                <span>{sourceLabel}</span>
              </div>
            </div>

            {question.anchorText && (
              <blockquote className="max-w-[600px] rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 text-[13px] leading-6 text-stone-500 shadow-sm">
                “{question.anchorText}”
              </blockquote>
            )}

            <p className="text-[15px] font-semibold leading-7 text-stone-800">
              {question.content}
            </p>

            <div className="pt-1">
              <div className="h-px w-full bg-stone-200/80" />
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-semibold text-stone-800">{question.author.name}</span>
                    {question.author.department && (
                      <span className="text-[13px] text-stone-400">{question.author.department}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-stone-400">{question.postedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full items-center justify-center">
          <FeedActions
            type="question"
            likes={question.likes}
            liked={question.liked}
            saved={question.saved}
            replyCount={question.replyCount}
            onOpenDiscussion={onOpenContext}
          />
        </div>
      </div>
    </motion.article>
  );
};

export default QuestionFeedCard;
