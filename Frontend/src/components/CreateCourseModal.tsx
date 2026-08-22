import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import CourseDetailsStep from './create-course/CourseDetailsStep';
import type { CourseDetailsData } from './create-course/CourseDetailsStep';
import UploadNotesStep from './create-course/UploadNotesStep';
import UploadExamsStep from './create-course/UploadExamsStep';
import SuccessStep from './create-course/SuccessStep';
import ConfirmationDialog from './create-course/ConfirmationDialog';
import Toast from './ui/Toast';
import type { FileItem } from './create-course/FileList';
import { createCourse, type CourseRead } from '../services/courseService';
import {
  uploadDocuments,
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_ACCEPT,
  PDF_ONLY_UPLOAD_MESSAGE,
  isPdfFile,
  MAX_UPLOAD_FILES,
} from '../services/documentService';

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (course: CourseRead) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = MAX_UPLOAD_FILES;

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [courseData, setCourseData] = useState<CourseDetailsData>({
    name: '',
    description: '',
    department: '',
    visibility: 'public',
  });

  const [notesFiles, setNotesFiles] = useState<FileItem[]>([]);
  const [examsFiles, setExamsFiles] = useState<FileItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  /** Files are only staged here; the real upload happens once the course exists. */
  const markFileReady = (fileId: string, setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 100, status: 'success' } : f));
  };

  const handleFilesSelected = (
    newFiles: File[],
    currentFiles: FileItem[],
    setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>,
    allowedExtensions: string[]
  ) => {
    if (currentFiles.length + newFiles.length > MAX_FILES) {
      showToast(`Maximum ${MAX_FILES} files allowed`, 'error');
      return;
    }

    const newFileItems: FileItem[] = [];

    newFiles.forEach(file => {
      if (currentFiles.some(f => f.file.name === file.name)) {
        showToast(`A file with this name already exists: ${file.name}`, 'error');
        return;
      }

      if (file.size === 0) {
        newFileItems.push({ id: Math.random().toString(), file, status: 'error', progress: 0, error: 'Cannot upload empty file' });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        newFileItems.push({ id: Math.random().toString(), file, status: 'error', progress: 0, error: 'File exceeds maximum size of 50MB' });
        return;
      }

      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(extension) || !isPdfFile(file)) {
        newFileItems.push({
          id: Math.random().toString(),
          file,
          status: 'error',
          progress: 0,
          error: PDF_ONLY_UPLOAD_MESSAGE,
        });
        return;
      }

      const fileItem: FileItem = { id: Math.random().toString(), file, status: 'uploading', progress: 0 };
      newFileItems.push(fileItem);
    });

    if (newFileItems.length > 0) {
      setFiles(prev => [...prev, ...newFileItems]);
      newFileItems.forEach(item => {
        if (item.status === 'uploading') {
          markFileReady(item.id, setFiles);
        }
      });
    }
  };

  const handleRemoveFile = (id: string, setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRetryFile = (id: string, setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading', progress: 0, error: undefined } : f));
    markFileReady(id, setFiles);
  };

  const hasUnsavedProgress = useCallback(() => {
    return (
      courseData.name !== '' ||
      courseData.description !== '' ||
      courseData.department !== '' ||
      notesFiles.length > 0 ||
      examsFiles.length > 0
    );
  }, [courseData, notesFiles, examsFiles]);

  const handleClose = () => {
    if (step === 4) {
      resetAndClose();
      return;
    }
    
    if (hasUnsavedProgress()) {
      setShowConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setCourseData({ name: '', description: '', department: '', visibility: 'public' });
    setNotesFiles([]);
    setExamsFiles([]);
    setIsSubmitting(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const course = await createCourse({
        title: courseData.name.trim(),
        description: courseData.description.trim() || null,
        category: courseData.department.trim() || null,
        visibility: courseData.visibility === 'private' ? 'PRIVATE' : 'PUBLIC',
      });

      const notes = notesFiles.filter(f => f.status === 'success').map(f => f.file);
      const exams = examsFiles.filter(f => f.status === 'success').map(f => f.file);

      try {
        if (notes.length) await uploadDocuments(course.id, notes, 'NOTE');
        if (exams.length) await uploadDocuments(course.id, exams, 'PAST_EXAM');
      } catch (uploadError) {
        showToast(
          uploadError instanceof Error
            ? `Course created, but upload failed: ${uploadError.message}`
            : 'Course created, but the upload failed.',
          'error',
        );
      }

      onCreated(course);
      showToast(`${course.title} created successfully!`, 'success');
      setStep(4);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create course. Please try again.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const variants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.2 }
    }),
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={handleClose}
            />
            
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[560px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {isSubmitting && (
                <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}>
                      <div className="w-8 h-8 border-4 border-teal-100 border-t-teal-600 rounded-full" />
                    </motion.div>
                  </div>
                  <p className="text-stone-800 font-bold">Creating course...</p>
                </div>
              )}

              {step !== 4 && (
                <div className="flex items-center justify-between p-6 pb-2 border-b border-stone-100">
                  <h2 className="text-xl font-bold text-stone-800">New Course</h2>
                  <button 
                    onClick={handleClose} 
                    disabled={isSubmitting}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
              )}

              <div className="p-6 md:p-8 overflow-hidden min-h-[400px]">
                <AnimatePresence mode="wait" custom={step}>
                  {step === 1 && (
                    <CourseDetailsStep
                      key="step1"
                      data={courseData}
                      onChange={setCourseData}
                      onNext={() => setStep(2)}
                      onCancel={handleClose}
                    />
                  )}
                  {step === 2 && (
                    <UploadNotesStep
                      key="step2"
                      files={notesFiles}
                      onFilesSelected={(files) => handleFilesSelected(files, notesFiles, setNotesFiles, ACCEPTED_UPLOAD_EXTENSIONS)}
                      onRemoveFile={(id) => handleRemoveFile(id, setNotesFiles)}
                      onRetryFile={(id) => handleRetryFile(id, setNotesFiles)}
                      onNext={() => setStep(3)}
                      onSkip={() => setStep(3)}
                    />
                  )}
                  {step === 3 && (
                    <UploadExamsStep
                      key="step3"
                      files={examsFiles}
                      onFilesSelected={(files) => handleFilesSelected(files, examsFiles, setExamsFiles, ACCEPTED_UPLOAD_EXTENSIONS)}
                      onRemoveFile={(id) => handleRemoveFile(id, setExamsFiles)}
                      onRetryFile={(id) => handleRetryFile(id, setExamsFiles)}
                      onBack={() => setStep(2)}
                      onSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                    />
                  )}
                  {step === 4 && (
                    <SuccessStep
                      key="step4"
                      notesCount={notesFiles.filter(f => f.status === 'success').length}
                      examsCount={examsFiles.filter(f => f.status === 'success').length}
                      onViewCourse={resetAndClose}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        open={showConfirm}
        onConfirm={resetAndClose}
        onCancel={() => setShowConfirm(false)}
      />

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default CreateCourseModal;