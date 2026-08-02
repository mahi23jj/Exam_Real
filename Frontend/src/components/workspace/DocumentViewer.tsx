import React from 'react';
import PDFViewer from './PDFViewer';
import PastExamViewer from './PastExamViewer';
import type { CourseDocument } from '../../types/workspace';
import type { TextSelection } from '../../types/workspace';

interface DocumentViewerProps {
  document: CourseDocument | null;
  highlightSectionId?: string | null;
  activeQuestionId?: string | null;
  onTextSelect: (selection: TextSelection) => void;
  onPinClick: (pinId: string) => void;
  onQuestionClick: (questionId: string) => void;
  onPracticeQuestion: (questionId: string) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  highlightSectionId,
  activeQuestionId,
  onTextSelect,
  onPinClick,
  onQuestionClick,
  onPracticeQuestion,
}) => {
  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📖</span>
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-2">Select a document</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            Choose a note or past exam from the explorer to begin studying.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-white/60">
      {document.type === 'note' ? (
        <PDFViewer
          document={document}
          highlightSectionId={highlightSectionId}
          onTextSelect={onTextSelect}
          onPinClick={onPinClick}
          onQuestionClick={onQuestionClick}
        />
      ) : (
        <PastExamViewer
          document={document}
          onPracticeQuestion={onPracticeQuestion}
          activeQuestionId={activeQuestionId}
        />
      )}
    </div>
  );
};

export default DocumentViewer;
