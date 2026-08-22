/** PDF text selection metadata sent to pins / learning-question APIs. */

export interface LocationBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LocationMetadata {
  version: number;
  source: string;
  page_dimensions: { width: number; height: number };
  regions: Array<{ type: string; bbox: LocationBbox }>;
}

export interface DocumentSelection {
  selectedText: string;
  pageNumber: number;
  pageDimensions: { width: number; height: number };
  bbox: LocationBbox;
  startOffset: number;
  endOffset: number;
  documentId: string;
  documentVersion: number;
  /** Viewport rect for floating toolbar positioning. */
  rect: DOMRect;
  locationMetadata: LocationMetadata;
}
