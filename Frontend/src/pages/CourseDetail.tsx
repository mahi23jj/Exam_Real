import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';

import AppLayout from '../components/layout/AppLayout';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import EmptyState from '../components/EmptyState';
import ProcessingTray from '../components/course/ProcessingTray';
import DocumentPreview from '../components/course/DocumentPreview';
import { getCourse, type CourseRead } from '../services/courseService';
import {
  fetchCourseDocuments,
  uploadDocuments,
  ACCEPTED_UPLOAD_ACCEPT,
  PDF_ONLY_UPLOAD_MESSAGE,
  isPdfFile,
  MAX_UPLOAD_FILES,
  type CourseDocument,
  type DocumentType,
} from '../services/documentService';
import { formatFileSize, formatRelativeTime } from '../utils/format';

const docTypeByTab: Record<'notes' | 'exams', DocumentType> = {
  notes: 'NOTE',
  exams: 'PAST_EXAM',
};

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [course, setCourse] = useState<CourseRead | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'exams'>('notes');
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CourseDocument | null>(null);
  const [processingRefreshKey, setProcessingRefreshKey] = useState(0);

  useEffect(() => {
    if (!courseId) return;
    getCourse(courseId)
      .then(setCourse)
      .catch((err) => setError(err instanceof Error ? err.message : 'Course not found'));
  }, [courseId]);

  const loadDocuments = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const docs = await fetchCourseDocuments(courseId, {
        status: ['COMPLETED'],
        docType: docTypeByTab[activeTab],
      });
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, activeTab]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!courseId || !fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_UPLOAD_FILES);
    const invalid = files.filter((f) => !isPdfFile(f));
    if (invalid.length > 0) {
      toast.error(PDF_ONLY_UPLOAD_MESSAGE);
      return;
    }

    setUploading(true);
    try {
      await uploadDocuments(courseId, files, docTypeByTab[activeTab]);
      toast.success(`${files.length} file(s) queued for processing`);
      setProcessingRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tabs: TabItem<'notes' | 'exams'>[] = [
    { id: 'notes', label: 'Notes' },
    { id: 'exams', label: 'Past Exams' },
  ];

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/courses')}
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
            title="Back to courses"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-stone-800 truncate">
              {course?.title ?? 'Course'}
            </h1>
            <p className="text-xs text-stone-400 truncate">
              {[course?.code, course?.category].filter(Boolean).join(' · ') || 'No category'}
            </p>
          </div>
          {courseId && (
            <ProcessingTray
              courseId={courseId}
              refreshKey={processingRefreshKey}
              onAllCompleted={() => void loadDocuments()}
            />
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 lg:px-10 py-10">
        {course?.description && (
          <p className="text-sm text-stone-500 mb-8 max-w-3xl leading-relaxed">{course.description}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <Tabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} layoutId="courseDocTabs" />

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all premium-shadow disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload {activeTab === 'notes' ? 'notes' : 'past exams'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm font-semibold text-rose-600 mb-4">{error}</p>
            <button
              onClick={() => void loadDocuments()}
              className="px-6 py-3 bg-teal-700 text-white rounded-2xl font-bold text-sm"
            >
              Try again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            illustration="mine"
            title="No documents yet"
            description="Upload PDFs, slides, or images — they appear here once processing completes."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setPreview(doc)}
                className="text-left bg-white rounded-2xl p-6 premium-shadow hover:premium-shadow-hover transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center mb-4">
                  {activeTab === 'notes' ? (
                    <FileText className="w-6 h-6 text-teal-600" />
                  ) : (
                    <ClipboardList className="w-6 h-6 text-rose-500" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-stone-800 truncate">
                  {doc.title || doc.file_name || 'Untitled document'}
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {[doc.file_type, formatFileSize(doc.file_size_bytes), formatRelativeTime(doc.created_at)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      {preview && <DocumentPreview document={preview} onClose={() => setPreview(null)} />}
    </AppLayout>
  );
};

export default CourseDetail;
