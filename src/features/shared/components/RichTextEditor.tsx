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
  AtSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Search users for @mentions
  const searchMentionUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?q=${query}&limit=5`);
      const data = await response.json();
      setMentionUsers(data.users || []);
    } catch (error) {
      console.error('Error searching mention users:', error);
      setMentionUsers([]);
    }
  }, []);

  // Handle text formatting commands
  const execCommand = useCallback(
    (command: string, value?: string) => {
      if (disabled) return;

      document.execCommand(command, false, value);
      editorRef.current?.focus();

      // Update the value after formatting
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [disabled, onChange]
  );

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerHTML;
    onChange(content);

    // Check for @mention trigger
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;

        // Find @ symbol before cursor
        const beforeCursor = text.substring(0, cursorPos);
        const atIndex = beforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
          const afterAt = beforeCursor.substring(atIndex + 1);

          // Check if there's a space after @ (which would end the mention)
          if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
            setShowMentions(true);
            setSelectedMentionIndex(0);
            searchMentionUsers(afterAt);

            // Calculate position for mention dropdown
            const rect = range.getBoundingClientRect();
            const editorRect = editorRef.current!.getBoundingClientRect();
            setMentionPosition({
              top: rect.bottom - editorRect.top + 5,
              left: rect.left - editorRect.left,
            });
            return;
          }
        }
      }
    }

    setShowMentions(false);
  }, [onChange, searchMentionUsers]);

  // Handle mention selection
  const insertMention = useCallback(
    (user: User) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;

        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || '';
          const cursorPos = range.startOffset;
          const beforeCursor = text.substring(0, cursorPos);
          const atIndex = beforeCursor.lastIndexOf('@');

          if (atIndex !== -1) {
            // Replace @query with @mention
            const beforeAt = text.substring(0, atIndex);
            const afterCursor = text.substring(cursorPos);

            const mentionSpan = document.createElement('span');
            mentionSpan.className =
              'mention bg-blue-100 text-blue-800 px-1 rounded';
            mentionSpan.contentEditable = 'false';
            mentionSpan.textContent = `@${user.name}`;
            mentionSpan.setAttribute('data-user-id', user.id);

            // Create new text nodes
            const beforeNode = document.createTextNode(beforeAt);
            const afterNode = document.createTextNode(' ' + afterCursor);

            // Replace the text node
            const parent = textNode.parentNode!;
            parent.insertBefore(beforeNode, textNode);
            parent.insertBefore(mentionSpan, textNode);
            parent.insertBefore(afterNode, textNode);
            parent.removeChild(textNode);

            // Set cursor after mention
            const newRange = document.createRange();
            newRange.setStartAfter(mentionSpan);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            onChange(editorRef.current.innerHTML);
          }
        }
      }

      setShowMentions(false);
    },
    [onChange]
  );

  // Handle keyboard navigation in mentions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && mentionUsers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev < mentionUsers.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev > 0 ? prev - 1 : mentionUsers.length - 1
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selectedUser = mentionUsers[selectedMentionIndex];
          if (selectedUser) {
            insertMention(selectedUser);
          }
        } else if (e.key === 'Escape') {
          setShowMentions(false);
        }
      }
    },
    [showMentions, mentionUsers, selectedMentionIndex, insertMention]
  );

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      <div className='space-y-2 mb-4'>
        <div className='flex items-center gap-1'>
          <Select defaultValue='paragraph'>
            <SelectTrigger className='w-32 h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='paragraph'>Paragraph</SelectItem>
              <SelectItem value='heading1'>Heading 1</SelectItem>
              <SelectItem value='heading2'>Heading 2</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation='vertical' className='h-6 mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => execCommand('bold')}
            disabled={disabled}
          >
            <Bold className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => execCommand('italic')}
            disabled={disabled}
          >
            <Italic className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
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
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => execCommand('justifyLeft')}
            disabled={disabled}
          >
            <AlignLeft className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => execCommand('justifyCenter')}
            disabled={disabled}
          >
            <AlignCenter className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
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
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => execCommand('insertUnorderedList')}
            disabled={disabled}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
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
          className={cn(
            'min-h-32 p-3 border rounded-md bg-background text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'prose prose-sm max-w-none',
            disabled && 'opacity-50 cursor-not-allowed',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground'
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />

        {/* Mention Dropdown */}
        {showMentions && mentionUsers.length > 0 && (
          <div
            className='absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto'
            style={{
              top: mentionPosition.top,
              left: mentionPosition.left,
            }}
          >
            {mentionUsers.map((user, index) => (
              <button
                key={user.id}
                type='button'
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2',
                  index === selectedMentionIndex &&
                    'bg-gray-50 dark:bg-gray-700'
                )}
                onClick={() => insertMention(user)}
              >
                <div className='flex-1'>
                  <div className='font-medium'>{user.name}</div>
                  <div className='text-sm text-gray-500'>{user.email}</div>
                </div>
                <div className='text-xs text-gray-400'>{user.role}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex items-center gap-2 mt-3'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='hover:bg-gray-100 dark:hover:bg-gray-700'
          onClick={onAttachmentClick}
          disabled={disabled}
        >
          <Paperclip className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='hover:bg-gray-100 dark:hover:bg-gray-700'
          disabled={disabled}
        >
          <Smile className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='hover:bg-gray-100 dark:hover:bg-gray-700'
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.focus();
              execCommand('insertText', '@');
            }
          }}
          disabled={disabled}
        >
          <AtSign className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

