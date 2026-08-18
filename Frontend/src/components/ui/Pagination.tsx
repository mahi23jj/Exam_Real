import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, size, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (size || 1)));
  if (totalPages <= 1) return null;

  const buttonClass =
    'flex items-center gap-1 px-4 py-2 rounded-2xl text-xs font-bold border border-stone-200 text-stone-600 bg-white transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav className="flex items-center justify-center gap-4 mt-10" aria-label="Pagination">
      <button className={buttonClass} onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="w-3.5 h-3.5" />
        Previous
      </button>
      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
        Page {page} of {totalPages}
      </span>
      <button className={buttonClass} onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

export default Pagination;
