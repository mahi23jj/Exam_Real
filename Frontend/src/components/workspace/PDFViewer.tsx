import React, { useRef, useCallback } from 'react';
import { Pin } from 'lucide-react';
import type { NoteDocument, KnowledgePin, PublicQuestion } from '../../types/workspace';
import type { TextSelection } from '../../types/workspace';

interface PDFViewerProps {
  document: NoteDocument;
  highlightSectionId?: string | null;
  onTextSelect: (selection: TextSelection) => void;
  onPinClick: (pinId: string) => void;
  onQuestionClick: (questionId: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  document,
  highlightSectionId,
  onTextSelect,
  onPinClick,
  onQuestionClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    onTextSelect({
      text: sel.toString().trim(),
      rect,
    });
  }, [onTextSelect]);

  const renderParagraphWithAnchors = (
    text: string,
    sectionId: string,
    pins: KnowledgePin[],
    questions: PublicQuestion[],
  ) => {
    const anchors: Array<{ start: number; end: number; type: 'pin' | 'question'; id: string }> = [];

    pins.forEach((pin) => {
      const idx = text.indexOf(pin.anchorText);
      if (idx !== -1) {
        anchors.push({ start: idx, end: idx + pin.anchorText.length, type: 'pin', id: pin.id });
      }
    });

    questions.forEach((q) => {
      const idx = text.indexOf(q.anchorText);
      if (idx !== -1) {
        anchors.push({ start: idx, end: idx + q.anchorText.length, type: 'question', id: q.id });
      }
    });

    anchors.sort((a, b) => a.start - b.start);

    if (anchors.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;

    anchors.forEach((anchor, i) => {
      if (anchor.start > cursor) {
        parts.push(<span key={`t-${i}`}>{text.slice(cursor, anchor.start)}</span>);
      }

      const anchorText = text.slice(anchor.start, anchor.end);

      if (anchor.type === 'pin') {
        parts.push(
          <span key={`pin-${anchor.id}`} className="relative inline">
            <mark className="bg-amber-100/80 text-stone-800 rounded px-0.5">{anchorText}</mark>
            <button
              onClick={() => onPinClick(anchor.id)}
              className="inline-flex items-center justify-center w-4 h-4 ml-0.5 -mt-3 align-super rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-colors"
              title="View pin"
            >
              <Pin className="w-2.5 h-2.5" />
            </button>
          </span>,
        );
      } else {
        parts.push(
          <span key={`q-${anchor.id}`} className="relative inline">
            <mark className="bg-sky-100/80 text-stone-800 rounded px-0.5">{anchorText}</mark>
            <button
              onClick={() => onQuestionClick(anchor.id)}
              className="inline-flex items-center justify-center w-4 h-4 ml-0.5 align-middle rounded-full bg-sky-500 text-white text-[9px] font-bold hover:bg-sky-600 transition-colors"
              title="View question"
            >
              ?
            </button>
          </span>,
        );
      }

      cursor = anchor.end;
    });

    if (cursor < text.length) {
      parts.push(<span key="tail">{text.slice(cursor)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="max-w-3xl mx-auto px-8 lg:px-12 py-10 lg:py-14 select-text"
    >
      <div className="mb-10 pb-6 border-b border-stone-100">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Notes</div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold text-stone-800">{document.name.replace('.pdf', '')}</h1>
      </div>

      <div className="space-y-10">
        {document.sections.map((section) => {
          const isHighlighted = highlightSectionId === section.id;
          return (
            <section
              key={section.id}
              id={section.id}
              className={`scroll-mt-8 transition-colors duration-500 rounded-2xl -mx-4 px-4 py-2 ${
                isHighlighted ? 'bg-teal-50/80 ring-1 ring-teal-200/60' : ''
              }`}
            >
              <h2 className="text-lg font-bold text-stone-800 mb-4 font-serif">{section.heading}</h2>
              <div className="space-y-4">
                {section.paragraphs.map((para, idx) => (
                  <p
                    key={idx}
                    className={`text-base leading-[1.85] text-stone-700 font-serif ${
                      isHighlighted && idx === 0 ? 'font-medium' : ''
                    }`}
                  >
                    {renderParagraphWithAnchors(para, section.id, document.pins, document.questions)}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default PDFViewer;
