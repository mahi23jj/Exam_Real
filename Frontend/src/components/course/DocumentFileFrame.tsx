import React from 'react';
import PdfJsViewer from '../workspace/PdfJsViewer';
import UnsupportedDocument from '../workspace/UnsupportedDocument';

interface DocumentFileFrameProps {
  url: string;
  name: string;
  fileType?: string | null;
  /** When set, renders PDF.js with text selection instead of a plain iframe. */
  documentId?: string;
  documentVersion?: number;
  onTextSelect?: Parameters<typeof PdfJsViewer>[0]['onTextSelect'];
}

/** Course-detail modal preview — PDF only; non-PDF shows unsupported state. */
const DocumentFileFrame: React.FC<DocumentFileFrameProps> = ({
  url,
  name,
  fileType,
  documentId,
  documentVersion = 1,
  onTextSelect,
}) => {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-stone-400">
        This document has no file URL.
      </div>
    );
  }

  const isPdf = fileType === 'PDF' || url.toLowerCase().includes('.pdf');
  if (!isPdf) {
    return <UnsupportedDocument fileType={fileType} name={name} />;
  }

  if (documentId && onTextSelect) {
    return (
      <PdfJsViewer
        url={url}
        documentId={documentId}
        documentVersion={documentVersion}
        onTextSelect={onTextSelect}
      />
    );
  }

  return (
    <PdfJsViewer
      url={url}
      documentId={documentId ?? 'preview'}
      documentVersion={documentVersion}
      onTextSelect={() => {}}
    />
  );
};

export default DocumentFileFrame;
