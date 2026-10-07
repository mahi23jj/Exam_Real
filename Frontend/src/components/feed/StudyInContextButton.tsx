import React from 'react';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ContentSourceRead } from '../../services/socialService';
import { canOpenSource, parseWorkspaceDeepLink } from '../../utils/deepLinks';

interface StudyInContextButtonProps {
  /** Resolved origin. When `can_open` is false the button is not rendered. */
  source?: ContentSourceRead | null;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * "Study in context" navigation for community content.
 *
 * This deliberately renders nothing unless the backend resolved a real
 * destination. Older code navigated to `/workspace/{courseId}` with
 * `sectionId`/`highlightText` in router state, which produced links that landed
 * on the wrong document or an empty viewer; the source resolver now owns that
 * decision.
 */
const StudyInContextButton: React.FC<StudyInContextButtonProps> = ({
  source,
  variant = 'default',
  className = '',
}) => {
  const navigate = useNavigate();

  if (!canOpenSource(source)) return null;

  const params = parseWorkspaceDeepLink(source.open_url);
  // The resolver can_open guarantee is belt-and-braces here: if the link cannot
  // be parsed we refuse to navigate rather than guess.
  if (!params) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(source.open_url);
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors duration-200 ${className}`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Study in Context
        <ArrowUpRight className="w-3 h-3" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50/60 text-sm font-bold text-teal-700 hover:bg-teal-100/60 hover:border-teal-300 transition-all duration-200 group ${className}`}
    >
      <BookOpen className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
      Study in Context
      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-y-0.5 transition-all duration-200" />
    </button>
  );
};

export default StudyInContextButton;