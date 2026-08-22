import React from 'react';
import { FileWarning } from 'lucide-react';

interface UnsupportedDocumentProps {
  fileType?: string | null;
  name?: string;
}

const UnsupportedDocument: React.FC<UnsupportedDocumentProps> = ({ fileType, name }) => (
  <div className="h-full flex items-center justify-center px-6">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <FileWarning className="w-8 h-8 text-amber-600" />
      </div>
      <h2 className="text-lg font-bold text-stone-800 mb-2">
        {name ? `"${name}"` : 'This document'} is not supported
      </h2>
      <p className="text-sm text-stone-500 leading-relaxed">
        {fileType
          ? `${fileType} files are not supported in the current StudyLoop reader.`
          : 'This file type is not supported in the current StudyLoop reader.'}{' '}
        Please upload a PDF to study with pins, questions, and annotations.
      </p>
    </div>
  </div>
);

export default UnsupportedDocument;
