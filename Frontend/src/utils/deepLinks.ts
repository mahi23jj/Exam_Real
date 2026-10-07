import type { ContentSourceRead } from '../services/socialService';

/** Workspace query parameters produced by the backend source resolver. */
export interface WorkspaceDeepLinkParams {
  documentId: string;
  pageNumber?: number | null;
  targetType?: string | null;
  targetId?: string | null;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  version?: number | null;
}

/**
 * A card may only advertise "Open in course" when the backend confirmed a real
 * destination exists. `canOpenSource` is the single gate every card should use
 * so a dead link is never rendered in the first place.
 */
export function canOpenSource(
  source?: ContentSourceRead | null,
): source is ContentSourceRead & { open_url: string } {
  return Boolean(source?.can_open && source.open_url);
}

/**
 * Short human label for a source, e.g. "CS101 · Week 1 Slides · p.7".
 * Returns null when there is nothing meaningful to show.
 */
export function formatSourceLabel(
  source?: ContentSourceRead | null,
): string | null {
  if (!source) return null;

  const parts: string[] = [];
  if (source.course_code) {
    parts.push(source.course_code);
  } else if (source.course_title) {
    parts.push(source.course_title);
  }
  if (source.document_title) {
    parts.push(source.document_title);
  }

  let label = parts.join(' · ');
  if (source.page_number) {
    label = label ? `${label} · p.${source.page_number}` : `p.${source.page_number}`;
  }
  return label || null;
}

/** Parses a backend-generated `/workspace/{courseId}?...` deep link. */
export function parseWorkspaceDeepLink(
  openUrl: string,
): WorkspaceDeepLinkParams | null {
  if (!openUrl) return null;

  const [path, query] = openUrl.split('?');
  const match = /^\/workspace\/([^/?#]+)/.exec(path ?? '');
  if (!match) return null;
  void match; // course id is implied by the route itself

  const params = new URLSearchParams(query ?? '');
  const documentId = params.get('document');
  if (!documentId) return null;

  const page = params.get('page');
  const selectionStart = params.get('selection_start');
  const selectionEnd = params.get('selection_end');
  const version = params.get('version');

  return {
    documentId,
    pageNumber: page ? Number(page) : null,
    targetType: params.get('target_type'),
    targetId: params.get('target_id'),
    selectionStart: selectionStart ? Number(selectionStart) : null,
    selectionEnd: selectionEnd ? Number(selectionEnd) : null,
    version: version ? Number(version) : null,
  };
}

/**
 * Reads deep-link parameters straight off the current URL search params, which
 * is how the workspace receives navigation from the feed, profile or modal.
 */
export function readDeepLinkFromSearch(
  search: URLSearchParams,
): WorkspaceDeepLinkParams | null {
  const documentId = search.get('document');
  if (!documentId) return null;

  const page = search.get('page');
  const selectionStart = search.get('selection_start');
  const selectionEnd = search.get('selection_end');
  const version = search.get('version');

  return {
    documentId,
    pageNumber: page ? Number(page) : null,
    targetType: search.get('target_type'),
    targetId: search.get('target_id'),
    selectionStart: selectionStart ? Number(selectionStart) : null,
    selectionEnd: selectionEnd ? Number(selectionEnd) : null,
    version: version ? Number(version) : null,
  };
}

/** Serialises deep-link params into a workspace href. */
export function buildWorkspaceHref(
  courseId: string,
  params: WorkspaceDeepLinkParams,
): string {
  const search = new URLSearchParams();
  search.set('document', params.documentId);
  if (params.pageNumber) search.set('page', String(params.pageNumber));
  if (params.targetType) search.set('target_type', params.targetType);
  if (params.targetId) search.set('target_id', params.targetId);
  if (params.selectionStart != null)
    search.set('selection_start', String(params.selectionStart));
  if (params.selectionEnd != null)
    search.set('selection_end', String(params.selectionEnd));
  if (params.version != null) search.set('version', String(params.version));
  return `/workspace/${courseId}?${search.toString()}`;
}