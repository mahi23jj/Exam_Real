import React from 'react';
import { BookOpen } from 'lucide-react';
import ExplorerFolder from './ExplorerFolder';
import type { ExplorerFolder as ExplorerFolderType } from '../../types/workspace';

interface CourseExplorerProps {
  courseName: string;
  folders: ExplorerFolderType[];
  openFolders: Set<string>;
  activeDocumentId: string | null;
  onToggleFolder: (folderId: string) => void;
  onFileSelect: (documentId: string) => void;
}

const CourseExplorer: React.FC<CourseExplorerProps> = ({
  courseName,
  folders,
  openFolders,
  activeDocumentId,
  onToggleFolder,
  onFileSelect,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
          <BookOpen className="w-3.5 h-3.5" />
          Explorer
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3">
        <div className="px-2 mb-3">
          <div className="text-sm font-bold text-stone-800 truncate">{courseName}</div>
        </div>

        {folders.map((folder) => (
          <ExplorerFolder
            key={folder.id}
            folder={folder}
            isOpen={openFolders.has(folder.id)}
            activeDocumentId={activeDocumentId}
            onToggle={() => onToggleFolder(folder.id)}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseExplorer;
