import React from 'react';
import { BookOpen, FileText, ClipboardList, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export type ContinueItemType = 'course' | 'document' | 'exam';
type ContinueColor = 'teal' | 'amber' | 'rose';

interface ContinueCardProps {
  type: ContinueItemType;
  title: string;
  subtitle: string;
  meta: string;
  progress: number; // 0 to 100
  onClick?: () => void;
}

const config: Record<ContinueItemType, { icon: React.ElementType; color: ContinueColor }> = {
  course: { icon: BookOpen, color: 'teal' },
  document: { icon: FileText, color: 'amber' },
  exam: { icon: ClipboardList, color: 'rose' },
};

const ContinueCard: React.FC<ContinueCardProps> = ({
  type,
  title,
  subtitle,
  meta,
  progress,
  onClick,
}) => {
  const { icon: Icon, color } = config[type];

  const colorClasses = {
    teal: 'border-teal-500 text-teal-600 bg-teal-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50',
    rose: 'border-rose-500 text-rose-600 bg-rose-50',
  };

  return (
    <div className="group flex-shrink-0 w-72 snap-start">
      <motion.button
        whileHover={{ y: -4 }}
        onClick={onClick}
        className={`relative w-full text-left bg-white rounded-2xl p-5 premium-shadow border-l-4 transition-all duration-300 ${colorClasses[color].split(' ')[0]}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${colorClasses[color].split(' ').slice(1).join(' ')}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-8 h-8">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="16" cy="16" r="14"
                fill="none" stroke="currentColor" strokeWidth="3"
                className="text-stone-100"
              />
              <circle
                cx="16" cy="16" r="14"
                fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={88}
                strokeDashoffset={88 - (88 * progress) / 100}
                strokeLinecap="round"
                className={colorClasses[color].split(' ')[1]}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-stone-500">
              {progress}%
            </span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-stone-800 mb-1 truncate">{title}</h3>
        <p className="text-xs text-stone-500 mb-4 truncate">{subtitle}</p>

        {/* Resume Button Overlay */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
          <div className="bg-teal-700 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Play className="w-3 h-3 fill-current" />
            Resume
          </div>
        </div>
      </motion.button>
      <div className="mt-3 px-1 text-[10px] font-medium text-stone-400 uppercase tracking-wider">
        {meta}
      </div>
    </div>
  );
};

export default ContinueCard;