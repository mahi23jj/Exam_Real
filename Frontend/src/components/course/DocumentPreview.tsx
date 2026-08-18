import React from 'react';
import { Download, X } from 'lucide-react';
import { motion } from 'framer-motion';

import type { CourseDocument } from '../../services/documentService';

interface DocumentPreviewProps {
  document: CourseDocument;
  onClose: () => void;
}

/** Office files cannot render inline, so they go through Microsoft's public viewer. */
function officeViewerUrl(url: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose }) => {
  const url = document.cloudinary_secure_url ?? '';
  const name = document.title || document.file_name || 'Document';
  const fileType = document.file_type ?? 'PDF';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white rounded-3xl overflow-hidden flex flex-col premium-shadow"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-stone-800 truncate">{name}</h2>
            <p className="text-xs text-stone-400 uppercase tracking-wider">{fileType}</p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
                title="Open original"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-stone-50">
          {!url ? (
            <div className="h-full flex items-center justify-center text-sm text-stone-400">
              This document has no file URL.
            </div>
          ) : fileType === 'IMAGE' ? (
            <img src={url} alt={name} className="w-full h-full object-contain" />
          ) : fileType === 'PPT' || fileType === 'PPTX' ? (
            <iframe title={name} src={officeViewerUrl(url)} className="w-full h-full border-0" />
          ) : (
            <iframe title={name} src={url} className="w-full h-full border-0" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentPreview;
