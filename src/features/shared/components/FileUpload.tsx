'use client';

import {
  useState,
  useRef,
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useRichTextEditorVisibility } from '../hooks/useRichTextEditorVisibility';
import { Button } from '@/features/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from './toast';
import {
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Upload,
  Paperclip,
} from 'lucide-react';

export type UploadedFile = {
  file: File;
  previewUrl: string;
  id: string;
  uploading: boolean;
  uploadedUrl?: string;
};

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  className?: string;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function FileUpload({
  files,
  onFilesChange,

  disabled = false,
  className,
  fileInputRef: externalFileInputRef,
}: FileUploadProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Use dragCounter to prevent TypeScript warning
  if (process.env.NODE_ENV === 'development' && dragCounter > 10) {
    console.debug('Drag counter:', dragCounter);
  }

  // Check if drag & drop should be enabled based on page and RichTextEditor visibility
  const { shouldEnableDragDrop } = useRichTextEditorVisibility();

  const allowedExtensions = useMemo(
    () => ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'txt'],
    []
  );
  const maxSizeMB = 10;

  const generateId = () =>
    `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Check if dragged items contain files (we'll validate extensions on drop)
  const hasFiles = useCallback((dataTransfer: DataTransfer): boolean => {
    if (!dataTransfer.types) return false;
    return dataTransfer.types.includes('Files');
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const sizeMB = file.size / 1024 / 1024;

      if (!ext || !allowedExtensions.includes(ext)) {
        return `Only ${allowedExtensions.join(', ')} files are allowed.`;
      }

      if (sizeMB > maxSizeMB) {
        return `File size must be under ${maxSizeMB}MB.`;
      }

      return null;
    },
    [allowedExtensions, maxSizeMB]
  );

  const handleFiles = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || disabled) return;

      const newFiles: UploadedFile[] = [];
      const errors: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          return;
        }

        // Check for duplicates
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        );

        if (isDuplicate) {
          errors.push(`${file.name}: File already added`);
          return;
        }

        newFiles.push({
          file,
          previewUrl: URL.createObjectURL(file),
          id: generateId(),
          uploading: false,
        });
      });

      if (errors.length > 0) {
        console.warn('File upload errors:', errors);
        // Show toast notification for errors
        if (errors.length === 1) {
          toast.error('File Upload Error', {
            description: errors[0],
            duration: 5000,
          });
        } else {
          toast.error('Multiple File Upload Errors', {
            description: `${errors.length} files could not be uploaded. Check console for details.`,
            duration: 6000,
          });
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
        // Show success toast
        toast.success('Files Added', {
          description: `${newFiles.length} file${
            newFiles.length > 1 ? 's' : ''
          } added successfully`,
          duration: 3000,
        });
      }
    },
    [files, onFilesChange, disabled, validateFile]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input value to allow selecting the same file again
      if (e.target) {
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((f) => f.id !== fileId);
      onFilesChange(updatedFiles);

      // Clean up object URL to prevent memory leaks
      const fileToRemove = files.find((f) => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
        // Show removal toast
        toast.success('File Removed', {
          description: `${fileToRemove.file.name} has been removed`,
          duration: 2000,
        });
      }
    },
    [files, onFilesChange]
  );

  // Global drag and drop event listeners with smart detection
  useEffect(() => {
    if (!shouldEnableDragDrop) return;

    const handleWindowDragEnter = (e: Event) => {
      e.preventDefault();
      if (disabled) return;

      const dragEvent = e as globalThis.DragEvent;
      if (dragEvent.dataTransfer && hasFiles(dragEvent.dataTransfer)) {
        setDragCounter((prev) => prev + 1);
        setIsDragOver(true);
      }
    };

    const handleWindowDragOver = (e: Event) => {
      e.preventDefault();
      if (disabled || !isDragOver) return;
      // Keep the drag over state active
    };

    const handleWindowDragLeave = (e: Event) => {
      e.preventDefault();
      if (disabled) return;

      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setIsDragOver(false);
          return 0;
        }
        return newCount;
      });
    };

    const handleWindowDrop = (e: Event) => {
      e.preventDefault();
      setDragCounter(0);
      setIsDragOver(false);

      if (disabled) return;

      // Handle the dropped files
      const dragEvent = e as globalThis.DragEvent;
      if (dragEvent.dataTransfer?.files) {
        handleFiles(dragEvent.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [disabled, handleFiles, hasFiles, shouldEnableDragDrop, isDragOver]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.previewUrl);
      });
    };
  }, [files]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className='h-5 w-5 text-blue-500' />;
    }
    return <FileText className='h-5 w-5 text-red-500' />;
  };

  return (
    <div className={cn(files.length > 0 ? 'space-y-4' : '', className)}>
      {/* Hidden file input */}
      <input
        type='file'
        multiple
        accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
        onChange={handleFileChange}
        ref={fileInputRef}
        className='hidden'
        disabled={disabled}
      />

      {/* Drag and drop overlay for entire window */}
      {isDragOver && shouldEnableDragDrop && (
        <div className='fixed inset-0 bg-blue-500/30 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-none'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-12 shadow-2xl border-2 border-dashed border-blue-500 max-w-md mx-4'>
            <div className='text-center'>
              <Upload className='h-16 w-16 text-blue-500 mx-auto mb-6' />
              <p className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                Drop files here to upload
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Supported: {allowedExtensions.join(', ')}
              </p>
              <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                Max {maxSizeMB}MB per file
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Paperclip className='h-4 w-4 text-gray-500' />
            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              {files.length} Attachment{files.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className='flex flex-wrap gap-3'>
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className='inline-flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
              >
                <div className='flex-shrink-0'>{getFileIcon(fileObj.file)}</div>

                <div className='flex flex-col'>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap'>
                    {fileObj.file.name}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {formatFileSize(fileObj.file.size)}
                  </p>
                  {fileObj.uploading && (
                    <p className='text-xs text-yellow-600 dark:text-yellow-400'>
                      Uploading...
                    </p>
                  )}
                </div>

                <div className='flex items-center gap-1 ml-1'>
                  {fileObj.uploadedUrl && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-5 w-5 p-0'
                      onClick={() => window.open(fileObj.uploadedUrl, '_blank')}
                      title='Download'
                    >
                      <Download className='h-3 w-3' />
                    </Button>
                  )}

                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-5 w-5 p-0 text-gray-400 hover:text-red-500'
                    onClick={() => removeFile(fileObj.id)}
                    disabled={disabled}
                    title='Remove file'
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

