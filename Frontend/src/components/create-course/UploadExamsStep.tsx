import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import StepIndicator from './StepIndicator';
import FileUploadZone from './FileUploadZone';
import FileList from './FileList';
import type { FileItem } from './FileList';
import { ACCEPTED_UPLOAD_ACCEPT, PDF_ONLY_UPLOAD_MESSAGE } from '../../services/documentService';

interface UploadExamsStepProps {
  files: FileItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onRetryFile: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const UploadExamsStep: React.FC<UploadExamsStepProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  onRetryFile,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  const isUploading = files.some(f => f.status === 'uploading');
  const hasErrors = files.some(f => f.status === 'error');
  const disableActions = isUploading || isSubmitting;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">Upload Course Materials (2/2)</h2>
        <StepIndicator currentStep={2} totalSteps={2} label="Add past exams" />
      </div>

      <FileUploadZone
        onFilesSelected={onFilesSelected}
        accept={ACCEPTED_UPLOAD_ACCEPT}
        disabled={disableActions}
      />
      <p className="text-xs text-stone-400 text-center">{PDF_ONLY_UPLOAD_MESSAGE}</p>

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
          onClick={onBack}
          disabled={disableActions}
          className="flex-1 py-4 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={disableActions || hasErrors}
          className="flex-[2] py-4 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Course...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default UploadExamsStep;
