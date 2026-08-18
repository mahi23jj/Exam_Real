import React from 'react';
import { motion } from 'framer-motion';
import StepIndicator from './StepIndicator';
import FileUploadZone from './FileUploadZone';
import FileList from './FileList';
import type { FileItem } from './FileList';

interface UploadNotesStepProps {
  files: FileItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onRetryFile: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

const UploadNotesStep: React.FC<UploadNotesStepProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  onRetryFile,
  onNext,
  onSkip,
}) => {
  const isUploading = files.some(f => f.status === 'uploading');
  const hasErrors = files.some(f => f.status === 'error');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">Upload Course Materials (1/2)</h2>
        <StepIndicator currentStep={1} totalSteps={2} label="Add your notes" />
      </div>

      <FileUploadZone
        onFilesSelected={onFilesSelected}
        accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
        disabled={isUploading}
      />

      <div className="max-h-48 overflow-y-auto pr-2">
        <FileList
          files={files}
          onRemove={onRemoveFile}
          onRetry={onRetryFile}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onSkip}
          disabled={isUploading}
          className="flex-1 py-4 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={onNext}
          disabled={isUploading || hasErrors}
          className="flex-[2] py-4 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};

export default UploadNotesStep;
