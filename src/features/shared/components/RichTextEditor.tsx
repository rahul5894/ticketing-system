'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HexColorPicker } from 'react-colorful';
import { RenderElementProps, RenderLeafProps } from 'slate-react';
import {
  CustomEditor,
  CustomText,
  SlateValue,
  createInitialValue,
  isBlockActive,
  isMarkActive,
} from './slate-types';

const DEFAULT_TEXT_COLOR = 'default';

const colorPickerStyles = `
  .react-colorful { width: 200px; height: 200px; }
  .react-colorful__saturation { width: 200px; height: 150px; border-radius: 8px 8px 0 0; }
  .react-colorful__hue { height: 24px; border-radius: 0 0 8px 8px; }
  .react-colorful__pointer { width: 16px; height: 16px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); }
`;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onAttachClick?: () => void;
}

const toggleBlock = (editor: CustomEditor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = ['numbered-list', 'bulleted-list'].includes(format);
  const isAlignment = ['align-left', 'align-center', 'align-right'].includes(
    format
  );

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      ['numbered-list', 'bulleted-list'].includes(n.type),
    split: true,
  });

  if (isAlignment) {
    const alignValue = format.replace('align-', '') as
      | 'left'
      | 'center'
      | 'right';
    Transforms.setNodes(editor, {
      style: { textAlign: alignValue === 'left' ? undefined : alignValue },
    } as Partial<SlateElement>);
  } else if (isActive) {
    Transforms.setNodes<SlateElement>(editor, { type: 'paragraph' });
  } else if (isList) {
    Transforms.setNodes<SlateElement>(editor, { type: 'list-item' });
    Transforms.wrapNodes(editor, {
      type: format as 'numbered-list' | 'bulleted-list',
      children: [],
    });
  } else {
    const nodeType = (
      ['heading-one', 'heading-two', 'block-quote'].includes(format)
        ? format
        : 'paragraph'
    ) as 'heading-one' | 'heading-two' | 'block-quote' | 'paragraph';
    Transforms.setNodes<SlateElement>(editor, { type: nodeType });
  }
};

const htmlToSlate = (html: string): SlateValue =>
  !html?.trim()
    ? createInitialValue()
    : [
        {
          type: 'paragraph',
          children: [{ text: html.replace(/<[^>]*>/g, '') }],
        },
      ];

const slateToHtml = (value: SlateValue): string =>
  value
    .map((node) => {
      if (!SlateElement.isElement(node)) return '';

      const children = node.children
        .map((child) => {
          if (!Text.isText(child)) return '';
          let text = child.text;
          // Apply color first (innermost) so formatting inherits it
          if (child.color && child.color !== DEFAULT_TEXT_COLOR)
            text = `<span style="color: ${child.color}">${text}</span>`;
          if (child.bold) text = `<strong>${text}</strong>`;
          if (child.italic) text = `<em>${text}</em>`;
          if (child.underline)
            text = `<u style="text-decoration-color: currentColor">${text}</u>`;
          return text;
        })
        .join('');

      // Handle block quotes with special styling
      if (node.type === 'block-quote') {
        const hasCustomColor = node.children.some(
          (child) =>
            Text.isText(child) &&
            child.color &&
            child.color !== DEFAULT_TEXT_COLOR
        );
        const customColor = hasCustomColor
          ? node.children.find(
              (child) =>
                Text.isText(child) &&
                child.color &&
                child.color !== DEFAULT_TEXT_COLOR
            )?.color
          : null;

        const borderStyle = customColor
          ? `border-left: 4px solid ${customColor};`
          : 'border-left: 4px solid hsl(var(--border));';
        const textStyle = hasCustomColor
          ? ''
          : 'color: hsl(var(--muted-foreground));';

        return `<blockquote style="${borderStyle} padding-left: 1rem; font-style: italic; margin: 0.5rem 0; ${textStyle}">${children}</blockquote>`;
      }

      const tagMap = {
        'heading-one': 'h1',
        'heading-two': 'h2',
        'bulleted-list': 'ul',
        'numbered-list': 'ol',
        'list-item': 'li',
      };
      const tag = tagMap[node.type as keyof typeof tagMap] || 'p';
      return `<${tag}>${children}</${tag}>`;
    })
    .join('');

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className,
  disabled = false,
  onAttachClick,
}: RichTextEditorProps) {
  const editor = useMemo(() => withReact(createEditor()), []);
  const [slateValue, setSlateValue] = useState<SlateValue>(() =>
    htmlToSlate(value)
  );
  const [currentTextColor, setCurrentTextColor] =
    useState<string>(DEFAULT_TEXT_COLOR);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>(
    () => ({
      bold: false,
      italic: false,
      underline: false,
    })
  );
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const toggleMark = useCallback(
    (format: keyof Omit<CustomText, 'text'>) => {
      const isActive =
        activeFormats[format] !== undefined
          ? activeFormats[format]
          : isMarkActive(editor, format);
      const newActiveState = !isActive;

      // Update persistent state
      setActiveFormats((prev) => ({ ...prev, [format]: newActiveState }));

      if (newActiveState) {
        Editor.addMark(editor, format, true);
        // Apply current text color when adding formatting
        if (currentTextColor !== DEFAULT_TEXT_COLOR) {
          Editor.addMark(editor, 'color', currentTextColor);
        }
      } else {
        Editor.removeMark(editor, format);
      }
      ReactEditor.focus(editor);
    },
    [editor, currentTextColor, activeFormats]
  );

  const toggleBlockFormat = useCallback(
    (format: string) => {
      toggleBlock(editor, format);
      ReactEditor.focus(editor);
    },
    [editor]
  );

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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            toggleMark('bold');
            break;
          case 'i':
            event.preventDefault();
            toggleMark('italic');
            break;
          case 'u':
            event.preventDefault();
            toggleMark('underline');
            break;
        }
      }
    },
    [toggleMark]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const pastedText = event.clipboardData.getData('text/plain');
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pastedText.trim())) {
        event.preventDefault();
        editor.insertText(pastedText.trim());
      }
    },
    [editor]
  );

  useEffect(() => setSlateValue(htmlToSlate(value)), [value]);

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

  // Helper function to check if any child has custom color
  const hasCustomColor = useCallback((element: SlateElement): boolean => {
    return element.children.some((child) => {
      if (Text.isText(child)) {
        return child.color && child.color !== DEFAULT_TEXT_COLOR;
      }
      return false;
    });
  }, []);

  // Render element function
  const renderElement = useCallback(
    (props: RenderElementProps) => {
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
        case 'block-quote': {
          const hasColor = hasCustomColor(element);
          const customColor = hasColor
            ? element.children.find(
                (child) =>
                  Text.isText(child) &&
                  child.color &&
                  child.color !== DEFAULT_TEXT_COLOR
              )?.color
            : null;

          return (
            <blockquote
              {...attributes}
              style={{
                ...style,
                borderLeftColor: customColor || undefined,
              }}
              className={cn(
                'border-l-4 pl-4 italic my-2',
                hasColor ? '' : 'border-border text-muted-foreground'
              )}
            >
              {children}
            </blockquote>
          );
        }

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
    },
    [hasCustomColor]
  );

  // Render leaf function for text formatting
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    const { attributes, children, leaf } = props;
    let element = children;

    // Apply color first (innermost) so formatting inherits it
    if (leaf.color && leaf.color !== DEFAULT_TEXT_COLOR) {
      element = <span style={{ color: leaf.color }}>{element}</span>;
    }

    if (leaf.bold) {
      element = <strong>{element}</strong>;
    }

    if (leaf.italic) {
      element = <em>{element}</em>;
    }

    if (leaf.underline) {
      element = (
        <u style={{ textDecorationColor: 'currentColor' }}>{element}</u>
      );
    }

    return <span {...attributes}>{element}</span>;
  }, []);

  const ToolbarButton = ({
    format,
    icon: Icon,
    isBlock = false,
  }: {
    format: string;
    icon: LucideIcon;
    isBlock?: boolean;
  }) => {
    const isActive = isBlock
      ? isBlockActive(editor, format)
      : activeFormats[format] !== undefined
      ? activeFormats[format]
      : isMarkActive(editor, format as keyof Omit<CustomText, 'text'>);

    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className={cn(
          'h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700',
          isActive && 'bg-gray-200 dark:bg-gray-600'
        )}
        onClick={() =>
          isBlock
            ? toggleBlockFormat(format)
            : toggleMark(format as keyof Omit<CustomText, 'text'>)
        }
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
            <ToolbarButton format='bold' icon={Bold} />
            <ToolbarButton format='italic' icon={Italic} />
            <ToolbarButton format='underline' icon={Underline} />

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
            <ToolbarButton format='block-quote' icon={Quote} isBlock />

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* Text Alignment Group */}
            <ToolbarButton format='align-left' icon={AlignLeft} isBlock />
            <ToolbarButton format='align-center' icon={AlignCenter} isBlock />
            <ToolbarButton format='align-right' icon={AlignRight} isBlock />

            <Separator orientation='vertical' className='h-6 mx-1' />

            {/* List Formatting Group */}
            <ToolbarButton format='bulleted-list' icon={List} isBlock />
            <ToolbarButton format='numbered-list' icon={ListOrdered} isBlock />

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

