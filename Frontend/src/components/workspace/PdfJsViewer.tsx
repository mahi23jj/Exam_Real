import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'pdfjs-dist/web/pdf_viewer.css';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

import { buildDocumentSelection } from '../../utils/pdfSelection';
import type { DocumentSelection } from '../../types/documentSelection';
import type { KnowledgePin, PublicQuestion } from '../../types/workspace';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;
const DEFAULT_ZOOM_SCALE = 1.0; // multiplier on top of fit-width

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
  const pageScalesRef = useRef<Map<number, number>>(new Map());
  const pageTextLengthsRef = useRef<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // zoomMultiplier: applied on top of the fit-width base scale
  const [zoomMultiplier, setZoomMultiplier] = useState(DEFAULT_ZOOM_SCALE);

  const changeZoom = (delta: number) => {
    setZoomMultiplier((prev) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((prev + delta) * 10) / 10)),
    );
  };

  const resetZoom = () => setZoomMultiplier(DEFAULT_ZOOM_SCALE);

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
          const baseScale = Math.min(1.5, Math.max(0.8, (containerWidth - 64) / unscaled.width));
          const scale = baseScale * zoomMultiplier;
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
  }, [url, zoomMultiplier]);


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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Zoom toolbar */}
      <div className="flex-shrink-0 flex items-center justify-end gap-1 px-4 py-2 bg-stone-50/80 border-b border-stone-200/60 backdrop-blur-sm">
        <button
          onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoomMultiplier <= MIN_ZOOM}
          title="Zoom out"
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          title="Reset zoom"
          className="px-2 py-1 rounded-lg text-xs font-bold text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors min-w-[3rem] text-center"
        >
          {Math.round(zoomMultiplier * 100)}%
        </button>
        <button
          onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoomMultiplier >= MAX_ZOOM}
          title="Zoom in"
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-stone-100/80 py-8" onMouseUp={handleMouseUp}>
        {loading && (
          <div className="flex items-center justify-center py-20 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="max-w-4xl mx-auto px-4" />
      </div>
    </div>
  );
};

export default PdfJsViewer;
