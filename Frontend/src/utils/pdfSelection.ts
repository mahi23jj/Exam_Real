import type * as PDFJS from 'pdfjs-dist';
import type { DocumentSelection, LocationMetadata } from '../types/documentSelection';

interface BuildSelectionParams {
  selection: Selection;
  pageElements: Map<number, HTMLElement>;
  pageViewports: Map<number, PDFJS.PageViewport>;
  pageTextLengths: Map<number, number>;
  documentId: string;
  documentVersion: number;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** PyMuPDF uses a top-left origin; PDF.js convertToPdfPoint uses bottom-left. */
function viewportPointToPdfTopLeft(
  viewport: PDFJS.PageViewport,
  x: number,
  y: number,
): { x: number; y: number } {
  const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);
  const pageHeight = viewport.height / viewport.scale;
  return { x: pdfX, y: pageHeight - pdfY };
}

function findPageForNode(
  node: Node,
  pageElements: Map<number, HTMLElement>,
): { pageNumber: number; pageEl: HTMLElement } | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.dataset.pdfPage) {
      const pageNumber = Number(current.dataset.pdfPage);
      return { pageNumber, pageEl: current };
    }
    current = current.parentNode;
  }

  for (const [pageNumber, pageEl] of pageElements.entries()) {
    if (pageEl.contains(node)) return { pageNumber, pageEl };
  }
  return null;
}

function computeOffsets(
  pageText: string,
  selectedText: string,
  priorPagesCharCount: number,
): { startOffset: number; endOffset: number } {
  const normalizedPage = normalizeWhitespace(pageText);
  const normalizedSelected = normalizeWhitespace(selectedText);
  const idx = normalizedPage.indexOf(normalizedSelected);
  if (idx === -1) {
    return { startOffset: priorPagesCharCount, endOffset: priorPagesCharCount + selectedText.length };
  }
  return {
    startOffset: priorPagesCharCount + idx,
    endOffset: priorPagesCharCount + idx + normalizedSelected.length,
  };
}

export function buildLocationMetadata(
  viewport: PDFJS.PageViewport,
  relRects: DOMRect[],
  pageEl: HTMLElement,
): LocationMetadata {
  const pageHeight = viewport.height / viewport.scale;
  const pageWidth = viewport.width / viewport.scale;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const pageRect = pageEl.getBoundingClientRect();

  relRects.forEach((rect) => {
    const relX = rect.left - pageRect.left;
    const relY = rect.top - pageRect.top;
    const relX2 = rect.right - pageRect.left;
    const relY2 = rect.bottom - pageRect.top;

    const topLeft = viewportPointToPdfTopLeft(viewport, relX, relY);
    const bottomRight = viewportPointToPdfTopLeft(viewport, relX2, relY2);

    minX = Math.min(minX, topLeft.x, bottomRight.x);
    minY = Math.min(minY, topLeft.y, bottomRight.y);
    maxX = Math.max(maxX, topLeft.x, bottomRight.x);
    maxY = Math.max(maxY, topLeft.y, bottomRight.y);
  });

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    version: 1,
    source: 'pdf',
    page_dimensions: { width: pageWidth, height: pageHeight },
    regions: [
      {
        type: 'question_text',
        bbox: {
          x: Number(minX.toFixed(2)),
          y: Number(minY.toFixed(2)),
          width: Number((maxX - minX).toFixed(2)),
          height: Number((maxY - minY).toFixed(2)),
        },
      },
    ],
  };
}

export function buildDocumentSelection(params: BuildSelectionParams): DocumentSelection | null {
  const { selection, pageElements, pageViewports, pageTextLengths, documentId, documentVersion } =
    params;

  if (selection.isCollapsed || !selection.rangeCount) return null;

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  const pageInfo = findPageForNode(range.commonAncestorContainer, pageElements);
  if (!pageInfo) return null;

  const { pageNumber, pageEl } = pageInfo;
  const viewport = pageViewports.get(pageNumber);
  if (!viewport) return null;

  const clientRects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  let unionRect = range.getBoundingClientRect();
  if (clientRects.length > 0) {
    let left = clientRects[0].left;
    let top = clientRects[0].top;
    let right = clientRects[0].right;
    let bottom = clientRects[0].bottom;
    clientRects.forEach((r) => {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    unionRect = new DOMRect(left, top, right - left, bottom - top);
  }

  if (unionRect.width === 0 && unionRect.height === 0) return null;

  const locationMetadata = buildLocationMetadata(viewport, clientRects.length ? clientRects : [unionRect], pageEl);
  const bbox = locationMetadata.regions[0].bbox;

  const priorChars = Array.from(pageTextLengths.entries())
    .filter(([num]) => num < pageNumber)
    .reduce((sum, [, len]) => sum + len, 0);

  const pageText = pageEl.dataset.pageText ?? '';
  const { startOffset, endOffset } = computeOffsets(pageText, selectedText, priorChars);

  return {
    selectedText,
    pageNumber,
    pageDimensions: locationMetadata.page_dimensions,
    bbox,
    startOffset,
    endOffset,
    documentId,
    documentVersion,
    rect: unionRect,
    locationMetadata,
  };
}
