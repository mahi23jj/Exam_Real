import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'pdfjs-dist/web/pdf_viewer.css';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

import { buildDocumentSelection } from '../../utils/pdfSelection';
import type { DocumentSelection } from '../../types/documentSelection';
import type { KnowledgePin, PublicQuestion } from '../../types/workspace';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfJsViewerProps {
  url: string;
  documentId: string;
  documentVersion: number;
  pins?: KnowledgePin[];
  questions?: PublicQuestion[];
  onTextSelect: (selection: DocumentSelection) => void;
  onPinClick?: (pinId: string) => void;
  onQuestionClick?: (questionId: string) => void;
}

const PdfJsViewer: React.FC<PdfJsViewerProps> = ({
  url,
  documentId,
  documentVersion,
  onTextSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const pageViewportsRef = useRef<Map<number, pdfjsLib.PageViewport>>(new Map());
  const pageTextLengthsRef = useRef<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pageElementsRef.current.clear();
    pageViewportsRef.current.clear();
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
  }, [url]);

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
