import React from 'react';
import PDFViewer from './PDFViewer';
import PastExamViewer from './PastExamViewer';
import SplitLearningCenter from './SplitLearningCenter';
import PdfJsViewer from './PdfJsViewer';
import UnsupportedDocument from './UnsupportedDocument';
import type {
  CourseDocument,
  NoteDocument,
  ExamQuestion,
  ExamHistoryItem,
  LocateTarget,
  SplitViewMode,
  DocumentSelection,
} from '../../types/workspace';

interface DocumentViewerProps {
  document: CourseDocument | null;
  documents: Record<string, CourseDocument>;
  highlightSectionId?: string | null;
  locateTarget?: LocateTarget | null;
  activeQuestionId?: string | null;
  jumpToQuestionId?: string | null;
  splitMode: SplitViewMode;
  practiceQuestion: ExamQuestion | null;
  practiceSelectedIndex: number | null;
  examHistory: ExamHistoryItem[];
  onTextSelect: (selection: DocumentSelection) => void;
  onPinClick: (pinId: string) => void;
  onQuestionClick: (questionId: string) => void;
  onPracticeQuestion: (questionId: string) => void;
  onSetSplitMode: (mode: SplitViewMode) => void;
  onCloseSplit: () => void;
}

function isPdfDocument(document: CourseDocument): boolean {
  return document.fileType === 'PDF' || Boolean(document.fileUrl?.toLowerCase().includes('.pdf'));
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  documents,
  highlightSectionId,
  locateTarget,
  activeQuestionId,
  jumpToQuestionId,
  splitMode,
  practiceQuestion,
  practiceSelectedIndex,
  examHistory,
  onTextSelect,
  onPinClick,
  onQuestionClick,
  onPracticeQuestion,
  onSetSplitMode,
  onCloseSplit,
}) => {
  if (
    (splitMode === 'split' || splitMode === 'expanded_note') &&
    practiceQuestion &&
    practiceSelectedIndex !== null
  ) {
    const noteDoc = practiceQuestion.noteReference
      ? (documents[practiceQuestion.noteReference.documentId] as NoteDocument | undefined)
      : undefined;

    return (
      <SplitLearningCenter
        question={practiceQuestion}
        selectedIndex={practiceSelectedIndex}
        noteDocument={noteDoc ?? null}
        highlightSectionId={highlightSectionId ?? practiceQuestion.noteReference?.sectionId ?? null}
        splitMode={splitMode}
        onSetSplitMode={onSetSplitMode}
        onCloseSplit={onCloseSplit}
      />
    );
  }

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

  if (document.fileUrl) {
    if (!isPdfDocument(document)) {
      return <UnsupportedDocument fileType={document.fileType} name={document.name} />;
    }

    return (
      <PdfJsViewer
        url={document.fileUrl}
        documentId={document.id}
        documentVersion={document.documentVersion ?? 1}
        pins={document.type === 'note' ? document.pins : []}
        questions={document.type === 'note' ? document.questions : []}
        onTextSelect={onTextSelect}
        onPinClick={onPinClick}
        onQuestionClick={onQuestionClick}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-white/60">
      {document.type === 'note' ? (
        <PDFViewer
          document={document}
          highlightSectionId={highlightSectionId}
          locateTarget={locateTarget}
          onTextSelect={onTextSelect}
          onPinClick={onPinClick}
          onQuestionClick={onQuestionClick}
        />
      ) : (
        <PastExamViewer
          document={document}
          onPracticeQuestion={onPracticeQuestion}
          activeQuestionId={activeQuestionId}
          jumpToQuestionId={jumpToQuestionId}
          history={examHistory}
        />
      )}
    </div>
  );
};

export default DocumentViewer;
