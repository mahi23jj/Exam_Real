import React from 'react';
import type { ConfidenceLevel } from '../../types/workspace';
import { ExternalLink } from 'lucide-react';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  noteTitle?: string;
  onOpenNote?: () => void;
}

const config: Record<ConfidenceLevel, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  high: {
    label: 'High Confidence',
    emoji: '🟢',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200/60',
  },
  medium: {
    label: 'Medium Confidence',
    emoji: '🟡',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/60',
  },
  low: {
    label: 'Low Confidence',
    emoji: '🔴',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200/60',
  },
};

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level, noteTitle, onOpenNote }) => {
  const c = config[level];

  return (
    <div className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{c.emoji}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{c.label}</span>
      </div>

      {level === 'high' && (
        <p className="text-sm text-emerald-700 leading-relaxed">
          Explanation verified directly from uploaded course notes.
        </p>
      )}
      {level === 'medium' && (
        <p className="text-sm text-amber-700 leading-relaxed">
          Explanation partially supported by notes. Some reasoning is inferred.
        </p>
      )}
      {level === 'low' && (
        <p className="text-sm text-rose-700 leading-relaxed">
          This answer is based on general knowledge and was not verified against your uploaded notes.
        </p>
      )}

      {(level === 'high' || level === 'medium') && onOpenNote && (
        <button
          onClick={onOpenNote}
          className="mt-3 flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-800 transition-colors"
        >
          Open Note
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}

      {noteTitle && (level === 'high' || level === 'medium') && (
        <p className="mt-1 text-xs text-stone-500">{noteTitle}</p>
      )}
    </div>
  );
};

export default ConfidenceBadge;
