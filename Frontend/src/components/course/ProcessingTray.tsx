import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';

import {
  fetchDocumentJob,
  fetchProcessingDocuments,
  type CourseDocument,
  type JobStatus,
  type ProcessingJob,
} from '../../services/documentService';

interface ProcessingTrayProps {
  courseId: string;
  /** Bump this value to force an immediate refresh (e.g. right after an upload). */
  refreshKey?: number;
  /** Called once every tracked job has left PENDING/PROCESSING. */
  onAllCompleted?: () => void;
}

const POLL_INTERVAL_MS = 4000;

const statusStyles: Record<JobStatus, string> = {
  PENDING: 'bg-stone-100 text-stone-500',
  PROCESSING: 'bg-teal-50 text-teal-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
};

const ProcessingTray: React.FC<ProcessingTrayProps> = ({ courseId, refreshKey = 0, onAllCompleted }) => {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [jobs, setJobs] = useState<Record<string, ProcessingJob>>({});
  const [loading, setLoading] = useState(false);
  const wasProcessingRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await fetchProcessingDocuments(courseId);
      setDocuments(docs);

      const jobResults = await Promise.all(
        docs.map(async (doc) => {
          try {
            return await fetchDocumentJob(doc.id);
          } catch {
            return null;
          }
        }),
      );
      setJobs(
        jobResults.reduce<Record<string, ProcessingJob>>((acc, job) => {
          if (job) acc[job.document_id] = job;
          return acc;
        }, {}),
      );

      const stillProcessing = docs.some(
        (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING',
      );
      if (wasProcessingRef.current && !stillProcessing) {
        onAllCompleted?.();
      }
      wasProcessingRef.current = stillProcessing;
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, onAllCompleted]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const isProcessing = documents.some(
    (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING',
  );
  const hasFailures = documents.some((doc) => doc.status === 'FAILED');

  // Poll only while something is actually in flight.
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isProcessing, refresh]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        title="Document processing"
        className="relative w-11 h-11 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100 transition-colors"
      >
        {isProcessing && (
          <motion.span
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 1.4 }}
            className="absolute inset-0 rounded-full border-2 border-teal-200 border-t-teal-600"
          />
        )}
        {hasFailures && !isProcessing ? (
          <AlertTriangle className="w-5 h-5 text-rose-600" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        {documents.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center">
            {documents.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-2xl premium-shadow border border-stone-100 p-4 z-40"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Processing</h3>
              {loading && <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" />}
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Nothing is processing right now.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {documents.map((doc) => {
                  const job = jobs[doc.id];
                  const status = (job?.status ?? doc.status ?? 'PENDING') as JobStatus;
                  return (
                    <li key={doc.id} className="border-b border-stone-50 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-stone-700 truncate">
                          {doc.title || doc.file_name || 'Untitled document'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status]}`}
                        >
                          {status}
                        </span>
                      </div>
                      {job?.current_step && (
                        <p className="text-xs text-stone-400 mt-1">{job.current_step}</p>
                      )}
                      {job?.error_message && (
                        <p className="text-xs text-rose-600 mt-1">{job.error_message}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProcessingTray;
