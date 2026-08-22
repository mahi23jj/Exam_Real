import React, { useState } from 'react';
import { ChevronRight, Search, MoreHorizontal, Focus, ArrowLeft, Menu, PanelRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface CourseHeaderProps {
  courseName: string;
  documentName?: string;
  focusMode: boolean;
  onToggleFocus: () => void;
  onToggleExplorer?: () => void;
  onToggleContext?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  courseName,
  documentName,
  focusMode,
  onToggleFocus,
  onToggleExplorer,
  onToggleContext,
  searchQuery,
  onSearchChange,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);

  if (focusMode) return null;

  return (
    <header className="h-14 flex-shrink-0 border-b border-stone-200/60 bg-background/90 backdrop-blur-xl z-20">
      <div className="h-full px-4 lg:px-6 flex items-center gap-3 lg:gap-4">
        <Link
          to="/courses"
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          title="Back to courses"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <button
          onClick={onToggleExplorer}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl text-stone-400 hover:bg-stone-100"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav className="flex items-center gap-1.5 min-w-0 flex-shrink">
          <span className="text-sm font-bold text-stone-800 truncate hidden sm:inline">{courseName}</span>
          {documentName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
              <span className="text-sm text-stone-500 truncate">{documentName}</span>
            </>
          )}
        </nav>

        <div className="flex-1 max-w-md mx-auto hidden md:block">
          <motion.div
            animate={{ scale: searchFocused ? 1.01 : 1 }}
            className="relative"
          >
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${searchFocused ? 'text-teal-600' : 'text-stone-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search in course..."
              className="w-full pl-9 pr-3 py-2 bg-stone-100/60 border border-stone-200/40 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-stone-200 transition-all"
            />
          </motion.div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleFocus}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            title="Focus mode (F)"
          >
            <Focus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Focus</span>
            <kbd className="hidden xl:inline px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono text-stone-400">F</kbd>
          </button>

          <button className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleContext}
            className="xl:hidden flex items-center justify-center w-8 h-8 rounded-xl text-stone-400 hover:bg-stone-100"
          >
            <PanelRight className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-stone-200 border border-white premium-shadow flex items-center justify-center text-[10px] font-bold text-stone-600">
            AL
          </div>
        </div>
      </div>
    </header>
  );
};

export default CourseHeader;
