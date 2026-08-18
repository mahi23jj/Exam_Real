import React from 'react';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, label }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Step {currentStep} of {totalSteps} &middot; {label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-teal-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

export default StepIndicator;
