'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/components/ui/select';
import { Separator } from '@/features/shared/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Paperclip,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onAttachmentClick?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className,
  disabled = false,
  onAttachmentClick,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Check which formats are currently active
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;

    const formats = new Set<string>();

    // Check for formatting commands
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('insertUnorderedList'))
      formats.add('unorderedList');
    if (document.queryCommandState('insertOrderedList'))
      formats.add('orderedList');

    // Check alignment
    if (document.queryCommandState('justifyLeft')) formats.add('alignLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('alignCenter');
    if (document.queryCommandState('justifyRight')) formats.add('alignRight');

    setActiveFormats(formats);
  }, []);

  // Handle text formatting commands
  const execCommand = useCallback(
    (command: string, value?: string) => {
      if (disabled) return;

      // Ensure editor is focused before executing command
      editorRef.current?.focus();

      // Execute the command
      const success = document.execCommand(command, false, value);

      // For list commands, ensure proper formatting
      if (
        (command === 'insertUnorderedList' ||
          command === 'insertOrderedList') &&
        success
      ) {
        // Force a re-render to ensure proper list styling
        setTimeout(() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }, 0);
      }

      // Update the value after formatting
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }

      // Update active formats after command execution
      setTimeout(updateActiveFormats, 0);
    },
    [disabled, onChange, updateActiveFormats]
  );

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerHTML;
    onChange(content);

    // Update active formats after content change
    setTimeout(updateActiveFormats, 0);
  }, [onChange, updateActiveFormats]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Basic keyboard handling can be added here if needed
    console.log('Key pressed:', e.key);
  }, []);

  // Handle paste events for email formatting
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData('text/plain');

      // Check if pasted text is an email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(pastedText.trim())) {
        e.preventDefault();

        // Insert the email as a clickable link
        const emailLink = `<a href="mailto:${pastedText.trim()}" class="text-blue-600 hover:text-blue-800 underline">${pastedText.trim()}</a>`;
        execCommand('insertHTML', emailLink);
      }
      // For non-email text, let the default paste behavior handle it
    },
    [execCommand]
  );

  // Handle emoji picker
  const handleEmojiPicker = useCallback(() => {
    if (disabled) return;

    // Try to use native emoji picker if available
    if ('showPicker' in HTMLInputElement.prototype) {
      // Create a temporary input element to trigger the emoji picker
      const tempInput = document.createElement('input');
      tempInput.type = 'text';
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      tempInput.style.opacity = '0';

      document.body.appendChild(tempInput);
      tempInput.focus();

      try {
        // Try to show the picker
        (
          tempInput as HTMLInputElement & { showPicker?: () => void }
        ).showPicker?.();

        // Listen for input to capture emoji
        const handleEmojiInput = (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            editorRef.current?.focus();
            execCommand('insertText', target.value);
          }
          document.body.removeChild(tempInput);
        };

        tempInput.addEventListener('input', handleEmojiInput, { once: true });

        // Cleanup if user doesn't select anything
        setTimeout(() => {
          if (document.body.contains(tempInput)) {
            document.body.removeChild(tempInput);
          }
        }, 5000);
      } catch (err) {
        // Fallback if showPicker fails
        console.warn('Native emoji picker failed:', err);
        document.body.removeChild(tempInput);
        showEmojiPickerFallback();
      }
    } else {
      // Fallback for browsers that don't support showPicker
      showEmojiPickerFallback();
    }
  }, [disabled, execCommand]);

  // Fallback emoji picker instructions
  const showEmojiPickerFallback = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isWindows = userAgent.includes('windows');
    const isMac = userAgent.includes('mac');

    let shortcut = '';
    if (isWindows) {
      shortcut = 'Windows key + . (period) or Windows key + ;';
    } else if (isMac) {
      shortcut = 'Cmd + Ctrl + Space';
    } else {
      shortcut = "your system's emoji shortcut";
    }

    alert(`To insert emojis, use ${shortcut}`);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(() => {
    if (disabled) return;

    try {
      // Create a hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = 'image/*,application/pdf,.doc,.docx,.txt';
      fileInput.style.display = 'none';

      // Handle file selection
      const handleFileChange = (e: Event) => {
        try {
          const target = e.target as HTMLInputElement;
          const files = target.files;

          if (files && files.length > 0) {
            // Validate file sizes (max 10MB per file)
            const maxSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = Array.from(files).filter(
              (file) => file.size > maxSize
            );

            if (oversizedFiles.length > 0) {
              alert(
                `The following files are too large (max 10MB): ${oversizedFiles
                  .map((f) => f.name)
                  .join(', ')}`
              );
              return;
            }

            // Call the onAttachmentClick callback if provided
            if (onAttachmentClick) {
              onAttachmentClick();
            } else {
              // Default behavior: show file names in the editor
              const fileNames = Array.from(files)
                .map((file) => file.name)
                .join(', ');
              editorRef.current?.focus();
              execCommand('insertText', `[Attached files: ${fileNames}]`);
            }
          }
        } catch (error) {
          console.error('Error handling file selection:', error);
          alert(
            'An error occurred while processing the selected files. Please try again.'
          );
        } finally {
          // Clean up
          if (document.body.contains(fileInput)) {
            document.body.removeChild(fileInput);
          }
        }
      };

      // Handle errors during file input creation
      const handleError = () => {
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
        alert('Unable to open file picker. Please try again.');
      };

      fileInput.addEventListener('change', handleFileChange);
      fileInput.addEventListener('error', handleError);
      document.body.appendChild(fileInput);

      // Trigger the file picker
      fileInput.click();
    } catch (error) {
      console.error('Error creating file picker:', error);
      alert('Unable to open file picker. Please try again.');
    }
  }, [disabled, onAttachmentClick, execCommand]);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Add selection change listener to update active formats
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveFormats();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats]);

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      <div className='space-y-2 mb-4'>
        <div className='flex items-center gap-1'>
          <Select
            defaultValue='paragraph'
            onValueChange={(value) => {
              if (value === 'heading1') {
                execCommand('formatBlock', '<h1>');
              } else if (value === 'heading2') {
                execCommand('formatBlock', '<h2>');
              } else {
                execCommand('formatBlock', '<p>');
              }
            }}
          >
            <SelectTrigger className='w-32 h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='paragraph'>
                <span className='text-sm'>Paragraph</span>
              </SelectItem>
              <SelectItem value='heading1'>
                <span className='text-lg font-bold'>Heading 1</span>
              </SelectItem>
              <SelectItem value='heading2'>
                <span className='text-base font-semibold'>Heading 2</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation='vertical' className='h-6 mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('bold') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('bold')}
            disabled={disabled}
          >
            <Bold className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('italic') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('italic')}
            disabled={disabled}
          >
            <Italic className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('underline') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('underline')}
            disabled={disabled}
          >
            <Underline className='h-4 w-4' />
          </Button>

          <Separator orientation='vertical' className='h-6 mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('alignLeft') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('justifyLeft')}
            disabled={disabled}
          >
            <AlignLeft className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('alignCenter') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('justifyCenter')}
            disabled={disabled}
          >
            <AlignCenter className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('alignRight') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('justifyRight')}
            disabled={disabled}
          >
            <AlignRight className='h-4 w-4' />
          </Button>

          <Separator orientation='vertical' className='h-6 mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('unorderedList') &&
                'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('insertUnorderedList')}
            disabled={disabled}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
              activeFormats.has('orderedList') && 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => execCommand('insertOrderedList')}
            disabled={disabled}
          >
            <ListOrdered className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className='relative'>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            'min-h-32 p-3 border rounded-md bg-background text-foreground',
            'prose prose-sm max-w-none no-focus-ring',
            disabled && 'opacity-50 cursor-not-allowed',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
            // Ensure proper list styling
            '[&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6',
            '[&_li]:mb-1',
            // Ensure proper heading styling
            '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-2',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-2',
            '[&_p]:mb-2'
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </div>

      {/* Action Buttons */}
      <div className='flex items-center gap-2 mt-3'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='hover:bg-gray-100 dark:hover:bg-gray-700'
          onClick={handleFileUpload}
          disabled={disabled}
        >
          <Paperclip className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='hover:bg-gray-100 dark:hover:bg-gray-700'
          onClick={handleEmojiPicker}
          disabled={disabled}
        >
          <Smile className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

