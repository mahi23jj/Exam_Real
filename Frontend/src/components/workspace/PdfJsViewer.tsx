import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'pdfjs-dist/web/pdf_viewer.css';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

import { buildDocumentSelection } from '../../utils/pdfSelection';
import type { DocumentSelection } from '../../types/documentSelection';
import type { KnowledgePin, PublicQuestion, ExamQuestion } from '../../types/workspace';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface QuestionLocationJson {
  page_dimensions?: { width?: number; height?: number };
  regions?: { type?: string; bbox?: { x: number; y: number; width: number; height: number } }[];
}

interface PdfJsViewerProps {
  url: string;
  documentId: string;
  documentVersion: number;
  pins?: KnowledgePin[];
  questions?: PublicQuestion[];
  /** Past-exam questions to overlay onto their stored PDF locations. */
  examQuestions?: ExamQuestion[];
  activeQuestionId?: string | null;
  onTextSelect: (selection: DocumentSelection) => void;
  onPinClick?: (pinId: string) => void;
  onQuestionClick?: (questionId: string) => void;
  onPracticeQuestion?: (questionId: string) => void;
}

const PdfJsViewer: React.FC<PdfJsViewerProps> = ({
  url,
  documentId,
  documentVersion,
  examQuestions,
  activeQuestionId,
  onTextSelect,
  onPracticeQuestion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const pageViewportsRef = useRef<Map<number, pdfjsLib.PageViewport>>(new Map());
  const pageScalesRef = useRef<Map<number, number>>(new Map());
  const pageTextLengthsRef = useRef<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pageElementsRef.current.clear();
    pageViewportsRef.current.clear();
    pageScalesRef.current.clear();
    pageTextLengthsRef.current.clear();

    const renderPdf = async () => {
      setLoading(true);
      setError(null);
      const host = containerRef.current;
      if (!host) return;

      host.innerHTML = '';

      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;

        const containerWidth = host.clientWidth || 800;
        const fragment = document.createDocumentFragment();

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const unscaled = page.getViewport({ scale: 1 });
          const scale = Math.min(1.5, Math.max(0.8, (containerWidth - 64) / unscaled.width));
          const viewport = page.getViewport({ scale });

          pageViewportsRef.current.set(pageNum, viewport);
          pageScalesRef.current.set(pageNum, scale);

          const pageWrapper = document.createElement('div');
          pageWrapper.className = 'pdf-page-wrapper relative mx-auto mb-6 bg-white premium-shadow rounded-lg overflow-hidden';
          pageWrapper.dataset.pdfPage = String(pageNum);
          pageWrapper.style.width = `${viewport.width}px`;
          pageWrapper.style.height = `${viewport.height}px`;

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'block';
          pageWrapper.appendChild(canvas);

          const textLayerDiv = document.createElement('div');
          textLayerDiv.className = 'textLayer absolute inset-0';
          pageWrapper.appendChild(textLayerDiv);

          fragment.appendChild(pageWrapper);
          pageElementsRef.current.set(pageNum, pageWrapper);

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;

          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join('');
          pageWrapper.dataset.pageText = pageText;
          pageTextLengthsRef.current.set(pageNum, pageText.length);

          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
        }

        host.appendChild(fragment);
        injectQuestionOverlays(host);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  /** Position past-exam question overlays using the persisted location_json bounding boxes. */
  const injectQuestionOverlays = (host: HTMLDivElement) => {
    if (!examQuestions || examQuestions.length === 0 || !onPracticeQuestion) return;

    for (const question of examQuestions) {
      if (!question.pageNumber) continue;
      const wrapper = host.querySelector<HTMLElement>(
        `.pdf-page-wrapper[data-pdf-page="${question.pageNumber}"]`,
      );
      const location = question.location as QuestionLocationJson | null;
      const bbox = location?.regions?.find((r) => r.bbox)?.bbox;
      if (!wrapper || !bbox) continue;

      const scale = pageScalesRef.current.get(question.pageNumber) ?? 1;

      const overlay = document.createElement('div');
      overlay.className =
        'exam-question-overlay group absolute rounded-md border-2 border-transparent hover:border-teal-400/70 hover:bg-teal-100/20 transition-colors cursor-pointer z-10';
      overlay.style.left = `${bbox.x * scale - 4}px`;
      overlay.style.top = `${bbox.y * scale - 4}px`;
      overlay.style.width = `${Math.max(bbox.width * scale + 8, 32)}px`;
      overlay.style.height = `${Math.max(bbox.height * scale + 8, 24)}px`;
      overlay.title = `Question ${question.number}`;
      if (activeQuestionId === question.id) {
        overlay.classList.add('border-teal-500', 'bg-teal-100/30');
      }
      overlay.addEventListener('click', (e) => {
        e.stopPropagation();
        onPracticeQuestion(question.id);
      });

      const chip = document.createElement('button');
      chip.className =
        'absolute left-1/2 top-full -translate-x-1/2 mt-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity premium-shadow whitespace-nowrap';
      chip.textContent = `Practice Q${question.number}`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        onPracticeQuestion(question.id);
      });
      overlay.appendChild(chip);

      wrapper.appendChild(overlay);
    }
  };

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selection = buildDocumentSelection({
      selection: sel,
      pageElements: pageElementsRef.current,
      pageViewports: pageViewportsRef.current,
      pageTextLengths: pageTextLengthsRef.current,
      documentId,
      documentVersion,
    });

    if (selection) onTextSelect(selection);
  }, [documentId, documentVersion, onTextSelect]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-stone-100/80 py-8" onMouseUp={handleMouseUp}>
      {loading && (
        <div className="flex items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="max-w-4xl mx-auto px-4" />
    </div>
  );
};

export default PdfJsViewer;
