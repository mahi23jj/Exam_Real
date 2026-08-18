import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export type FileStatus = 'uploading' | 'success' | 'error';

export interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number; // 0 to 100
  error?: string;
}

interface FileListProps {
  files: FileItem[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileList: React.FC<FileListProps> = ({ files, onRemove, onRetry }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <AnimatePresence mode="popLayout">
        {files.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative flex items-center p-3 rounded-xl border ${
              item.status === 'error' ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-stone-50'
            }`}
          >
            <div className="mr-3">
              <FileText className={`w-8 h-8 ${item.status === 'error' ? 'text-red-400' : 'text-teal-600'}`} />
            </div>
            
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-stone-800 truncate">{item.file.name}</p>
                <span className="text-xs text-stone-500 ml-2 whitespace-nowrap">{formatSize(item.file.size)}</span>
              </div>
              
              {item.status === 'uploading' && (
                <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-teal-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              
              {item.status === 'error' && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {item.error}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {item.status === 'error' && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="p-1.5 text-stone-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Retry upload"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={item.status === 'uploading'}
                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FileList;
