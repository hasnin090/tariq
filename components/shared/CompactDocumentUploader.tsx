import React, { useState, useRef } from 'react';
import { PaperClipIcon, XCircleIcon, FileIcon, SpinnerIcon } from './Icons';

interface CompactDocumentUploaderProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
}

const CompactDocumentUploader: React.FC<CompactDocumentUploaderProps> = ({ 
  onFilesChange, 
  maxFiles = 5,
  acceptedTypes = "image/*,application/pdf,.doc,.docx,.xls,.xlsx"
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const totalFiles = [...selectedFiles, ...newFiles];
      
      if (totalFiles.length > maxFiles) {
        alert(`يمكنك إرفاق ${maxFiles} ملفات كحد أقصى`);
        return;
      }

      setSelectedFiles(totalFiles);
      onFilesChange(totalFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
          id="compact-file-upload"
        />
        <label
          htmlFor="compact-file-upload"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer transition-colors border border-slate-300 dark:border-slate-600 text-sm font-medium"
        >
          <PaperClipIcon className="h-4 w-4" />
          <span>إرفاق مستندات</span>
        </label>
        {selectedFiles.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({selectedFiles.length}/{maxFiles} ملف)
          </span>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileIcon mimeType={file.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
                title="إزالة"
              >
                <XCircleIcon className="h-5 w-5 text-slate-400 hover:text-rose-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompactDocumentUploader;
