import React from 'react';
import { motion } from 'framer-motion';

const SkeletonCard: React.FC<{ variant: 'pin' | 'question' }> = ({ variant }) => (
  <div className="flex h-[clamp(600px,72vh,750px)] w-full max-w-[840px] overflow-hidden rounded-[28px] border border-teal-100/80 bg-white/80 px-4 py-4 shadow-[0_0_0_1px_rgba(20,184,166,0.08),0_22px_50px_rgba(15,118,110,0.06)] animate-pulse md:px-6 md:py-5">
    <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_80px] gap-3 md:grid-cols-[minmax(0,1fr)_84px] lg:grid-cols-[minmax(0,1fr)_88px]">
      <div className="mx-auto flex h-full w-full max-w-[700px] flex-col justify-center gap-3 md:gap-3.5">
        <div className="h-4 w-36 rounded-full bg-stone-100" />
        <div className="h-5 w-24 rounded-full bg-stone-100" />
        <div className="h-3.5 w-2/5 rounded-full bg-stone-100" />
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded-full bg-stone-100" />
          <div className="h-3.5 w-5/6 rounded-full bg-stone-100" />
          {variant === 'pin' && <div className="h-3.5 w-3/5 rounded-full bg-stone-100" />}
        </div>
        <div className="h-12 rounded-[18px] bg-stone-100/80" />
      </div>
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        <div className="h-8 w-8 rounded-2xl bg-stone-100/80" />
        <div className="h-8 w-8 rounded-2xl bg-stone-100/80" />
        <div className="h-8 w-8 rounded-2xl bg-stone-100/80" />
      </div>
    </div>
  </div>
);

const FeedSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
  >
    <SkeletonCard variant="pin" />
    <SkeletonCard variant="question" />
    <SkeletonCard variant="pin" />
  </motion.div>
);

export default FeedSkeleton;
