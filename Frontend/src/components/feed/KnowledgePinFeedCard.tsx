import React from 'react';
import { motion } from 'framer-motion';
import type { FeedPin } from './feedTypes';
import type { PinType } from '../../types/workspace';
import RecommendationBadge from './RecommendationBadge';
import FeedActions from './FeedActions';

const pinTypeConfig: Record<PinType, { label: string; color: string; dot: string }> = {
  memory_trick: {
    label: 'Memory Trick',
    color: 'bg-purple-50 text-purple-700',
    dot: 'bg-purple-400',
  },
  implementation_tip: {
    label: 'Implementation Tip',
    color: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-400',
  },
  exam_hint: {
    label: 'Exam Hint',
    color: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-400',
  },
  warning: {
    label: 'Warning',
    color: 'bg-rose-50 text-rose-700',
    dot: 'bg-rose-400',
  },
  explanation: {
    label: 'Explanation',
    color: 'bg-teal-50 text-teal-700',
    dot: 'bg-teal-400',
  },
};

interface KnowledgePinFeedCardProps {
  pin: FeedPin;
  onOpenContext?: () => void;
}

const KnowledgePinFeedCard: React.FC<KnowledgePinFeedCardProps> = ({ pin, onOpenContext }) => {
  const cfg = pinTypeConfig[pin.pinType];
  const initials = pin.author.initials;

  const sourceLabel = `${pin.course} Notes`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.24 }}
      onClick={onOpenContext}
      className="group relative flex h-[clamp(600px,72vh,750px)] w-full max-w-[840px] cursor-pointer overflow-hidden rounded-[28px] border border-teal-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfa_100%)] shadow-[0_0_0_1px_rgba(20,184,166,0.08),0_22px_50px_rgba(15,118,110,0.08)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(20,184,166,0.14),0_26px_58px_rgba(15,118,110,0.12)]"
      aria-label={`Knowledge pin: ${pin.content.slice(0, 60)}…`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.1),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,118,110,0.06),transparent_30%)]" />
      <div className="relative grid h-full w-full grid-cols-[minmax(0,1fr)_80px] gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_84px] md:px-6 md:py-5 lg:grid-cols-[minmax(0,1fr)_88px] lg:px-7 lg:py-6">
        <div className="flex h-full min-w-0 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-[700px] flex-col gap-3 md:gap-3.5">
            <RecommendationBadge reason={pin.recommendation} />

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700">
                <span>📌</span>
                <span>{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-stone-500">
                <span>{pin.course}</span>
                <span className="text-stone-300">·</span>
                <span>{pin.topic}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-stone-400">
                <span>📄</span>
                <span>{sourceLabel}</span>
              </div>
            </div>

            <p className="text-[15px] leading-7 text-stone-700">
              {pin.content}
            </p>

            {pin.anchorText && (
              <blockquote className="max-w-[600px] rounded-[20px] border border-stone-200 bg-white/80 px-4 py-3 text-[13px] leading-6 text-stone-500 shadow-sm">
                “{pin.anchorText}”
              </blockquote>
            )}

            <div className="pt-1">
              <div className="h-px w-full bg-stone-200/80" />
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-semibold text-stone-800">{pin.author.name}</span>
                    {pin.author.department && (
                      <span className="text-[13px] text-stone-400">{pin.author.department}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-stone-400">{pin.postedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full items-center justify-center">
          <FeedActions type="pin" likes={pin.likes} liked={pin.liked} saved={pin.saved} />
        </div>
      </div>
    </motion.article>
  );
};

export default KnowledgePinFeedCard;
