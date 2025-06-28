'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  createEditor,
  Editor,
  Transforms,
  Text,
  Element as SlateElement,
  Range,
} from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
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
  List,
  ListOrdered,
  Palette,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HexColorPicker } from 'react-colorful';
import { RenderElementProps, RenderLeafProps } from 'slate-react';
import { LucideIcon } from 'lucide-react';
import {
  CustomEditor,
  CustomText,
  SlateValue,
  createInitialValue,
  isBlockActive,
  isMarkActive,
} from './slate-types';

// Special constant to indicate default theme color should be used
const DEFAULT_TEXT_COLOR = 'default';

// Minimal CSS for react-colorful
const colorPickerStyles = `
  .react-colorful {
    width: 200px;
    height: 200px;
  }

  .react-colorful__saturation {
    width: 200px;
    height: 150px;
    border-radius: 8px 8px 0 0;
  }

  .react-colorful__hue {
    height: 24px;
    border-radius: 0 0 8px 8px;
  }

  .react-colorful__pointer {
    width: 16px;
    height: 16px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onAttachClick?: () => void;
}

// Helper functions for Slate operations

const toggleBlock = (editor: CustomEditor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = ['numbered-list', 'bulleted-list'].includes(format);
  const isAlignment = ['align-left', 'align-center', 'align-right'].includes(
    format
  );

  // Unwrap any existing lists
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      ['numbered-list', 'bulleted-list'].includes(n.type),
    split: true,
  });

  if (isAlignment) {
    // Handle text alignment by setting CSS styles
    const alignValue = format.replace('align-', '') as
      | 'left'
      | 'center'
      | 'right';
    Transforms.setNodes(editor, {
      style: { textAlign: alignValue === 'left' ? undefined : alignValue },
    } as Partial<SlateElement>);
  } else if (isActive) {
    // If toggling off, convert to paragraph
    Transforms.setNodes<SlateElement>(editor, { type: 'paragraph' });
  } else if (isList) {
    // If creating a list, first convert to list-item
    Transforms.setNodes<SlateElement>(editor, { type: 'list-item' });
    // Then wrap in the appropriate list container
    if (format === 'numbered-list') {
      Transforms.wrapNodes(editor, { type: 'numbered-list', children: [] });
    } else if (format === 'bulleted-list') {
      Transforms.wrapNodes(editor, { type: 'bulleted-list', children: [] });
    }
  } else {
    // For headings, blockquote and other block types
    if (format === 'heading-one') {
      Transforms.setNodes<SlateElement>(editor, { type: 'heading-one' });
    } else if (format === 'heading-two') {
      Transforms.setNodes<SlateElement>(editor, { type: 'heading-two' });
    } else if (format === 'block-quote') {
      Transforms.setNodes<SlateElement>(editor, { type: 'block-quote' });
    } else {
      Transforms.setNodes<SlateElement>(editor, { type: 'paragraph' });
    }
  }
};

// Convert HTML to Slate value (basic implementation)
const htmlToSlate = (html: string): SlateValue => {
  if (!html || html.trim() === '') {
    return createInitialValue();
  }

  // For now, return a simple paragraph with the HTML as text
  // This can be enhanced later with proper HTML parsing
  return [
    {
      type: 'paragraph',
      children: [{ text: html.replace(/<[^>]*>/g, '') }],
    },
  ];
};

// Convert Slate value to HTML (basic implementation)
const slateToHtml = (value: SlateValue): string => {
  return value
    .map((node) => {
      if (SlateElement.isElement(node)) {
        const children = node.children
          .map((child) => {
            if (Text.isText(child)) {
              let text = child.text;
              if (child.bold) text = `<strong>${text}</strong>`;
              if (child.italic) text = `<em>${text}</em>`;
              if (child.underline) text = `<u>${text}</u>`;
              if (child.color && child.color !== DEFAULT_TEXT_COLOR) {
                text = `<span style="color: ${child.color}">${text}</span>`;
              }
              return text;
            }
            return '';
          })
          .join('');

        switch (node.type) {
          case 'heading-one':
            return `<h1>${children}</h1>`;
          case 'heading-two':
            return `<h2>${children}</h2>`;
          case 'block-quote':
            return `<blockquote>${children}</blockquote>`;
          case 'bulleted-list':
            return `<ul>${children}</ul>`;
          case 'numbered-list':
            return `<ol>${children}</ol>`;
          case 'list-item':
            return `<li>${children}</li>`;
          default:
            return `<p>${children}</p>`;
        }
      }
      return '';
    })
    .join('');
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className,
  disabled = false,
  onAttachClick,
}: RichTextEditorProps) {
  const editor = useMemo(() => withReact(createEditor()), []);

  // Convert HTML value to Slate value
  const [slateValue, setSlateValue] = useState<SlateValue>(() =>
    htmlToSlate(value)
  );

  // Text color state
  const [currentTextColor, setCurrentTextColor] =
    useState<string>(DEFAULT_TEXT_COLOR);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Active formatting states for persistent button states
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    'bulleted-list': boolean;
    'numbered-list': boolean;
    'block-quote': boolean;
    'align-left': boolean;
    'align-center': boolean;
    'align-right': boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    'bulleted-list': false,
    'numbered-list': false,
    'block-quote': false,
    'align-left': false,
    'align-center': false,
    'align-right': false,
  });

  // Function to update active formats based on current editor state
  const updateActiveFormats = useCallback(() => {
    if (!editor.selection) return;

    setActiveFormats({
      bold: isMarkActive(editor, 'bold'),
      italic: isMarkActive(editor, 'italic'),
      underline: isMarkActive(editor, 'underline'),
      'bulleted-list': isBlockActive(editor, 'bulleted-list'),
      'numbered-list': isBlockActive(editor, 'numbered-list'),
      'block-quote': isBlockActive(editor, 'block-quote'),
      'align-left': isBlockActive(editor, 'align-left'),
      'align-center': isBlockActive(editor, 'align-center'),
      'align-right': isBlockActive(editor, 'align-right'),
    });
  }, [editor]);

  // Enhanced toggle functions that maintain persistent visual state
  const toggleMarkPersistent = useCallback(
    (format: keyof Omit<CustomText, 'text'>) => {
      const currentlyActive =
        activeFormats[format as keyof typeof activeFormats];

      // Toggle the visual active state first
      const newActiveState = !currentlyActive;
      setActiveFormats((prev) => ({
        ...prev,
        [format]: newActiveState,
      }));

      // Apply or remove the mark in the editor
      // This ensures the formatting will be applied to new text
      if (newActiveState) {
        Editor.addMark(editor, format, true);
      } else {
        Editor.removeMark(editor, format);
      }

      // Focus the editor to maintain cursor position
      ReactEditor.focus(editor);
    },
    [editor, activeFormats]
  );

  const toggleBlockPersistent = useCallback(
    (format: string) => {
      const currentlyActive =
        activeFormats[format as keyof typeof activeFormats];

      // For block formats, we need to handle them differently
      // Lists and quotes should toggle their visual state
      if (['bulleted-list', 'numbered-list', 'block-quote'].includes(format)) {
        setActiveFormats((prev) => ({
          ...prev,
          [format]: !currentlyActive,
        }));
      }

      // Apply the block formatting using the existing toggleBlock function
      toggleBlock(editor, format);

      // Focus the editor to maintain cursor position
      ReactEditor.focus(editor);
    },
    [editor, activeFormats]
  );

  // Initialize active formats only when component mounts
  useEffect(() => {
    if (editor.selection) {
      updateActiveFormats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Text color functions
  const handleTextColorChange = useCallback(
    (color: string) => {
      if (disabled) return;
      ReactEditor.focus(editor);

      // Apply color to selected text if any
      if (editor.selection && !Range.isCollapsed(editor.selection)) {
        Editor.addMark(editor, 'color', color);
      }

      // Set the color for future text
      setCurrentTextColor(color);

      // Apply the mark to the editor for new text
      Editor.addMark(editor, 'color', color);
    },
    [disabled, editor]
  );

  const resetTextColor = useCallback(() => {
    if (disabled) return;
    ReactEditor.focus(editor);
    Editor.removeMark(editor, 'color');
    setCurrentTextColor(DEFAULT_TEXT_COLOR);
    setShowTextColorPicker(false); // Close dropdown after reset
  }, [disabled, editor]);

  const getComputedThemeColor = useCallback(() => {
    // Get computed color from CSS for theme support
    if (typeof window !== 'undefined') {
      const computedStyle = window.getComputedStyle(document.documentElement);
      return computedStyle.getPropertyValue('--foreground') || '#000000';
    }
    return '#000000';
  }, []);

  const getDisplayColor = useCallback(() => {
    if (currentTextColor === DEFAULT_TEXT_COLOR) {
      const computedColor = getComputedThemeColor();
      // Convert CSS custom property to hex if needed
      if (computedColor.startsWith('oklch')) {
        // For now, return a default color for oklch values
        return '#000000';
      }
      return computedColor;
    }
    return currentTextColor;
  }, [currentTextColor, getComputedThemeColor]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b': {
            event.preventDefault();
            toggleMarkPersistent('bold');
            break;
          }
          case 'i': {
            event.preventDefault();
            toggleMarkPersistent('italic');
            break;
          }
          case 'u': {
            event.preventDefault();
            toggleMarkPersistent('underline');
            break;
          }
          default:
            break;
        }
        return;
      }

      // For regular typing, ensure active marks are applied
      if (event.key.length === 1 || event.key === 'Enter') {
        // Apply active formatting marks before typing
        Object.entries(activeFormats).forEach(([format, isActive]) => {
          if (['bold', 'italic', 'underline'].includes(format) && isActive) {
            const markFormat = format as keyof Omit<CustomText, 'text'>;
            Editor.addMark(editor, markFormat, true);
          }
        });
      }
    },
    [editor, activeFormats, toggleMarkPersistent]
  );

  // Paste handler for email formatting
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const pastedText = event.clipboardData.getData('text/plain');

      // Check if pasted text is an email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(pastedText.trim())) {
        event.preventDefault();

        // Insert the email as plain text for now
        // In a more advanced implementation, this could be a link
        editor.insertText(pastedText.trim());
      }
      // For non-email text, let the default paste behavior handle it
    },
    [editor]
  );

  // Update Slate value when external value changes
  useEffect(() => {
    const newSlateValue = htmlToSlate(value);
    setSlateValue(newSlateValue);
  }, [value]);

  // Apply current text color to new text
  useEffect(() => {
    if (currentTextColor !== DEFAULT_TEXT_COLOR) {
      Editor.addMark(editor, 'color', currentTextColor);
    } else {
      Editor.removeMark(editor, 'color');
    }
  }, [editor, currentTextColor]);

  // Click outside to close color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setShowTextColorPicker(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTextColorPicker(false);
      }
    };

    if (showTextColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showTextColorPicker]);

  // Handle Slate value changes
  const handleSlateChange = useCallback(
    (newValue: SlateValue) => {
      setSlateValue(newValue);
      const htmlValue = slateToHtml(newValue);
      onChange(htmlValue);

      // Don't update active formats here to preserve persistent visual state
      // The visual state should only change when buttons are explicitly clicked
    },
    [onChange]
  );

  // Render element function
  const renderElement = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props;
    const style =
      (element as SlateElement & { style?: React.CSSProperties }).style || {};

    switch (element.type) {
      case 'heading-one':
        return (
          <h1 {...attributes} style={style}>
            {children}
          </h1>
        );
      case 'heading-two':
        return (
          <h2 {...attributes} style={style}>
            {children}
          </h2>
        );
      case 'block-quote':
        return (
          <blockquote
            {...attributes}
            style={style}
            className='border-l-4 border-border pl-4 italic text-muted-foreground my-2'
          >
            {children}
          </blockquote>
        );

      case 'bulleted-list':
        return (
          <ul {...attributes} style={style}>
            {children}
          </ul>
        );
      case 'numbered-list':
        return (
          <ol {...attributes} style={style}>
            {children}
          </ol>
        );
      case 'list-item':
        return (
          <li {...attributes} style={style}>
            {children}
          </li>
        );
      default:
        return (
          <p {...attributes} style={style}>
            {children}
          </p>
        );
    }
  }, []);

  // Render leaf function for text formatting
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    const { attributes, children, leaf } = props;
    let element = children;

    if (leaf.bold) {
      element = <strong>{element}</strong>;
    }

    if (leaf.italic) {
      element = <em>{element}</em>;
    }

    if (leaf.underline) {
      element = <u>{element}</u>;
    }

    if (leaf.color && leaf.color !== DEFAULT_TEXT_COLOR) {
      element = <span style={{ color: leaf.color }}>{element}</span>;
    }

    return <span {...attributes}>{element}</span>;
  }, []);

  // Toolbar button components
  const MarkButton = ({
    format,
    icon: Icon,
  }: {
    format: keyof Omit<CustomText, 'text'>;
    icon: LucideIcon;
  }) => {
    // Use persistent active state instead of isMarkActive
    const isActive = activeFormats[format as keyof typeof activeFormats];

    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className={cn(
          'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
          isActive && 'bg-gray-200 dark:bg-gray-600'
        )}
        onClick={() => toggleMarkPersistent(format)}
        disabled={disabled}
      >
        <Icon className='h-4 w-4' />
      </Button>
    );
  };

  const BlockButton = ({
    format,
    icon: Icon,
  }: {
    format: string;
    icon: LucideIcon;
  }) => {
    // Use persistent active state for supported formats, fallback to isBlockActive for others
    const isActive = [
      'bulleted-list',
      'numbered-list',
      'block-quote',
      'align-left',
      'align-center',
      'align-right',
    ].includes(format)
      ? activeFormats[format as keyof typeof activeFormats]
      : isBlockActive(editor, format);

    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className={cn(
          'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
          isActive && 'bg-gray-200 dark:bg-gray-600'
        )}
        onClick={() => {
          if (
            [
              'bulleted-list',
              'numbered-list',
              'block-quote',
              'align-left',
              'align-center',
              'align-right',
            ].includes(format)
          ) {
            toggleBlockPersistent(format);
          } else {
            toggleBlock(editor, format);
          }
        }}
        disabled={disabled}
      >
        <Icon className='h-4 w-4' />
      </Button>
    );
  };

  return (
    <div className={cn('relative', className)} data-rich-text-editor='true'>
      <Slate
        editor={editor}
        initialValue={slateValue}
        onChange={handleSlateChange}
      >
        {/* Toolbar */}
        <div className='space-y-2 mb-4'>
          <div className='flex items-center gap-1'>
            <Select
              key='format-select'
              defaultValue='paragraph'
              onValueChange={(value) => {
                if (disabled) return;
                ReactEditor.focus(editor);

                if (value === 'heading1') {
                  toggleBlock(editor, 'heading-one');
                } else if (value === 'heading2') {
                  toggleBlock(editor, 'heading-two');
                } else if (value === 'blockquote') {
                  toggleBlock(editor, 'block-quote');
                } else {
                  toggleBlock(editor, 'paragraph');
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
                <SelectItem value='blockquote'>
                  <span className='text-sm italic text-gray-600'>Quote</span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* Text Formatting Group */}
            <MarkButton format='bold' icon={Bold} />
            <MarkButton format='italic' icon={Italic} />
            <MarkButton format='underline' icon={Underline} />

            {/* Text Color Picker */}
            <div className='relative color-picker-container'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className={cn(
                  'h-8 w-8 p-0 relative transition-all duration-200',
                  showTextColorPicker
                    ? 'bg-gray-200 dark:bg-gray-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                disabled={disabled}
                title='Text Color'
              >
                <Palette className='h-4 w-4' />
                {/* Only show bottom border indicator for non-default colors */}
                {currentTextColor !== DEFAULT_TEXT_COLOR && (
                  <div
                    className='absolute bottom-0 left-0 right-0 h-1 rounded-b'
                    style={{ backgroundColor: currentTextColor }}
                  />
                )}
              </Button>

              {/* React-colorful color picker */}
              {showTextColorPicker && (
                <div
                  ref={colorPickerRef}
                  className='absolute top-10 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3'
                >
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Text Color
                  </div>
                  <style>{colorPickerStyles}</style>
                  <HexColorPicker
                    color={getDisplayColor()}
                    onChange={handleTextColorChange}
                  />
                  <div className='mt-2 flex items-center gap-2'>
                    <button
                      type='button'
                      className='px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                      onClick={resetTextColor}
                    >
                      Reset
                    </button>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      {currentTextColor === DEFAULT_TEXT_COLOR
                        ? 'Default'
                        : currentTextColor.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* Block Formatting Group */}
            <BlockButton format='block-quote' icon={Quote} />

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* Text Alignment Group */}
            <BlockButton format='align-left' icon={AlignLeft} />
            <BlockButton format='align-center' icon={AlignCenter} />
            <BlockButton format='align-right' icon={AlignRight} />

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* List Formatting Group */}
            <BlockButton format='bulleted-list' icon={List} />
            <BlockButton format='numbered-list' icon={ListOrdered} />

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* File Attachment */}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
              onClick={() => {
                onAttachClick?.();
              }}
              disabled={disabled}
              title='Attach File'
            >
              <Paperclip className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className='relative'>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={cn(
              // Match Input component styling exactly
              'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input block w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
              'focus-visible:border-ring',
              'aria-invalid:border-destructive',
              // Additional styles for rich text editor with proper text color and fixed height
              'h-32 max-h-32 overflow-y-auto overflow-x-hidden prose prose-sm max-w-none no-focus-ring text-foreground',
              disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
              // Override prose text colors to use foreground color for dark mode support
              '[&_p]:text-foreground [&_div]:text-foreground',
              '[&_strong]:text-foreground [&_em]:text-foreground [&_u]:text-foreground',
              '[&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground',
              '[&_li]:text-foreground [&_ul]:text-foreground [&_ol]:text-foreground',
              // Ensure proper list styling with better alignment
              '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-0 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-0',
              '[&_li]:mb-1 [&_li]:pl-1',
              // Ensure proper heading styling
              '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-2',
              '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-2',
              '[&_p]:mb-2'
            )}
          />
        </div>
      </Slate>
    </div>
  );
}

