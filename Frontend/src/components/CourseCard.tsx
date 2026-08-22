import React from 'react';
import { BookOpen, Users, FileText, ClipboardList, Plus, Check, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type CourseCardVariant = 'explore' | 'following' | 'mine';

interface CourseCardProps {
  variant: CourseCardVariant;
  title: string;
  description?: string | null;
  creator?: string | null;
  students?: number | null;
  materials?: number | null;
  exams?: number | null;
  lastUpdated?: string | null;
  tag?: string | null;
  isFollowing?: boolean | null;
  isActive?: boolean;
  onFollow?: () => void;
  onOpen?: () => void;
  onManage?: () => void;
}

const DESCRIPTION_MAX_CHARS = 120;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

const Stat: React.FC<{ icon: React.ElementType; value: number | string }> = ({
  icon: Icon,
  value,
}) => (
  <div className="flex items-center gap-1.5 text-xs text-stone-500">
    <Icon className="w-3.5 h-3.5 text-stone-400" />
    <span className="font-semibold text-stone-700">{value}</span>
  </div>
);

const CourseCard: React.FC<CourseCardProps> = ({
  variant,
  title,
  description,
  creator,
  students,
  materials,
  exams,
  lastUpdated,
  tag,
  isFollowing,
  isActive = true,
  onFollow,
  onOpen,
  onManage,
}) => {
  const creatorName = creator?.trim() || 'Unknown';
  const initials =
    creatorName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <motion.div
      whileHover={isActive ? { y: -6 } : undefined}
      aria-disabled={!isActive}
      className={`group relative rounded-2xl p-6 premium-shadow transition-all duration-300 flex flex-col h-full ${
        isActive
          ? 'bg-white hover:premium-shadow-hover'
          : 'bg-stone-100 grayscale opacity-70 cursor-not-allowed pointer-events-none select-none'
      }`}
    >
      {!isActive && (
        <div className="absolute top-4 right-4 px-2 py-0.5 bg-stone-200 text-stone-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
          Inactive
        </div>
      )}

      {tag && isActive && (
        <div className="absolute top-4 right-4 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
          {tag}
        </div>
      )}

      <div className="flex items-start gap-4 mb-5">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors duration-300">
          <BookOpen className="w-6 h-6 text-stone-400 group-hover:text-teal-600 transition-colors duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-stone-800 truncate group-hover:text-teal-900 transition-colors duration-300">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-500 border border-white">
              {initials}
            </div>
            <span className="text-xs text-stone-500 font-medium">{creatorName}</span>
          </div>
        </div>
      </div>

      {description ? (
        <p className="text-sm text-stone-500 mb-6 line-clamp-2 leading-relaxed">
          {truncate(description, DESCRIPTION_MAX_CHARS)}
        </p>
      ) : (
        <p className="text-sm text-stone-300 italic mb-6">No description</p>
      )}

      <div className="flex items-center gap-4 mb-6 mt-auto">
        {students != null && <Stat icon={Users} value={students} />}
        {materials != null && <Stat icon={FileText} value={materials} />}
        {exams != null && <Stat icon={ClipboardList} value={exams} />}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-stone-50">
        {variant === 'explore' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onFollow?.(); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              isFollowing 
                ? 'bg-teal-50 text-teal-700' 
                : 'bg-stone-100 text-stone-600 hover:bg-teal-600 hover:text-white'
            }`}
          >
            {isFollowing ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : variant === 'mine' && onManage ? (
          <button
            onClick={(e) => { e.stopPropagation(); onManage(); }}
            className="text-[10px] font-bold text-stone-400 uppercase tracking-wider hover:text-teal-700 transition-colors"
          >
            Manage course
          </button>
        ) : (
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            {lastUpdated ? `Updated ${lastUpdated}` : 'Creator'}
          </span>
        )}

        <button
          onClick={onOpen}
          disabled={!isActive || !onOpen}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-700 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 disabled:text-stone-400"
        >
          Open
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default CourseCard;