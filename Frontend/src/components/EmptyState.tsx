import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  illustration?: 'explore' | 'following' | 'mine';
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, illustration }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6"
    >
      <div className="w-48 h-48 mb-8 relative">
        {/* Simple SVG Illustrations */}
        <svg viewBox="0 0 200 200" className="w-full h-full text-stone-100 fill-current">
          <circle cx="100" cy="100" r="80" />
          {illustration === 'explore' && (
            <path d="M70 70h60v60H70z" className="text-teal-100" />
          )}
          {illustration === 'following' && (
            <path d="M100 60l20 40h-40z" className="text-amber-100" />
          )}
          {illustration === 'mine' && (
            <circle cx="100" cy="100" r="30" className="text-rose-100" />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white premium-shadow flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-stone-50 animate-pulse" />
          </div>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 max-w-xs mb-8 leading-relaxed">{description}</p>
      {action}
    </motion.div>
  );
};

export default EmptyState;