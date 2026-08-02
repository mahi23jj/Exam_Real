import React from 'react';
import { FileText, ClipboardList } from 'lucide-react';
import type { DocumentType } from '../../types/workspace';

interface ExplorerFileProps {
  name: string;
  type: DocumentType;
  isActive: boolean;
  onClick: () => void;
}

const ExplorerFile: React.FC<ExplorerFileProps> = ({ name, type, isActive, onClick }) => {
  const Icon = type === 'past_exam' ? ClipboardList : FileText;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 group ${
        isActive
          ? 'bg-teal-50 text-teal-800 font-semibold'
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          isActive ? 'text-teal-600' : 'text-stone-400 group-hover:text-stone-500'
        }`}
      />
      <span className="truncate">{name}</span>
    </button>
  );
};

export default ExplorerFile;
