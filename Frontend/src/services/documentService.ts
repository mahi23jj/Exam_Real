import { apiGet, apiPostForm } from './apiClient';

export type DocumentType = 'NOTE' | 'PAST_EXAM';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type FileType = 'PDF' | 'PPT' | 'PPTX' | 'IMAGE';

export const PENDING_STATUSES: JobStatus[] = ['PENDING', 'PROCESSING', 'FAILED'];

export const ACCEPTED_UPLOAD_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp'];
export const MAX_UPLOAD_FILES = 10;

export interface CourseDocument {
  id: string;
  course_id: string;
  title?: string | null;
  file_name?: string | null;
  file_type?: FileType | null;
  doc_type?: DocumentType | null;
  cloudinary_public_id?: string | null;
  cloudinary_secure_url?: string | null;
  file_size_bytes?: number | null;
  status?: JobStatus | null;
  metadata_json?: Record<string, unknown> | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProcessingJob {
  id: string;
  document_id: string;
  status?: JobStatus | null;
  current_step?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UploadResponseItem {
  document: CourseDocument;
  job?: ProcessingJob | null;
}

export async function uploadDocuments(
  courseId: string,
  files: File[],
  docType: DocumentType
): Promise<UploadResponseItem[]> {
  const formData = new FormData();
  formData.append('doc_type', docType);
  files.forEach((file) => formData.append('files', file));
  return apiPostForm<UploadResponseItem[]>(`/courses/${courseId}/documents`, formData);
}

export async function fetchCourseDocuments(
  courseId: string,
  options: { status?: JobStatus[]; docType?: DocumentType } = {}
): Promise<CourseDocument[]> {
  const data = await apiGet<{ items: CourseDocument[]; total: number }>(
    `/courses/${courseId}/documents`,
    { status: options.status, doc_type: options.docType }
  );
  return Array.isArray(data?.items) ? data.items : [];
}

/** Documents that are not COMPLETED yet — drives the processing tray. */
export async function fetchProcessingDocuments(courseId: string): Promise<CourseDocument[]> {
  return fetchCourseDocuments(courseId, { status: PENDING_STATUSES });
}

export async function fetchDocumentJob(documentId: string): Promise<ProcessingJob> {
  return apiGet<ProcessingJob>(`/documents/${documentId}/job`);
}
