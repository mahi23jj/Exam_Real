import React from 'react';
import type { RecommendationReason } from './feedTypes';
import { recommendationLabels } from './feedTypes';

interface RecommendationBadgeProps {
  reason: RecommendationReason;
}

const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({ reason }) => {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-stone-500">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
      <span className="leading-none text-stone-500">
        {recommendationLabels[reason]}
      </span>
    </div>
  );
};

export default RecommendationBadge;
