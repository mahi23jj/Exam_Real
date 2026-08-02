import React from 'react';
import { ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExplorerFile from './ExplorerFile';
import type { ExplorerFolder as ExplorerFolderType } from '../../types/workspace';

interface ExplorerFolderProps {
  folder: ExplorerFolderType;
  isOpen: boolean;
  activeDocumentId: string | null;
  onToggle: () => void;
  onFileSelect: (documentId: string) => void;
}

const ExplorerFolder: React.FC<ExplorerFolderProps> = ({
  folder,
  isOpen,
  activeDocumentId,
  onToggle,
  onFileSelect,
}) => {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-stone-500 uppercase tracking-wider hover:bg-stone-50 hover:text-stone-700 transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
        {isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-stone-400" />
        )}
        {folder.name}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pt-0.5 pb-1 space-y-0.5">
              {folder.items.map((item) => (
                <ExplorerFile
                  key={item.id}
                  name={item.name}
                  type={item.type}
                  isActive={activeDocumentId === item.documentId}
                  onClick={() => onFileSelect(item.documentId)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplorerFolder;
