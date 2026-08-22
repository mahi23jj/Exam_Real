import React from 'react';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudyInContextButtonProps {
  courseId: string;
  documentId: string;
  sectionId: string;
  highlightText: string;
  variant?: 'default' | 'compact';
}

const StudyInContextButton: React.FC<StudyInContextButtonProps> = ({
  courseId,
  documentId,
  sectionId,
  highlightText,
  variant = 'default',
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workspace/${courseId}`, {
      state: { documentId, sectionId, highlightText },
    });
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors duration-200"
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
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50/60 text-sm font-bold text-teal-700 hover:bg-teal-100/60 hover:border-teal-300 transition-all duration-200 group"
    >
      <BookOpen className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
      📖 Study in Context
      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-y-0.5 transition-all duration-200" />
    </button>
  );
};

export default StudyInContextButton;
