import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  accept,
  disabled = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [disabled, onFilesSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input so the same file can be selected again if removed
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onFilesSelected]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
        disabled 
          ? 'bg-stone-50 border-stone-200 cursor-not-allowed opacity-60'
          : isDragActive
            ? 'bg-teal-50/50 border-teal-500'
            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 hover:border-stone-300'
      }`}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled}
      />
      
      <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-500'}`}>
        <UploadCloud className="w-8 h-8" />
      </div>
      
      <h3 className="text-sm font-bold text-stone-800 mb-1">
        Drag & drop your files here
      </h3>
      <p className="text-xs text-stone-500 mb-4">
        or click to browse from your computer
      </p>
      
      <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        <span>Max 50MB per file</span>
        <span>&bull;</span>
        <span>Up to 20 files</span>
      </div>
    </div>
  );
};

export default FileUploadZone;
