import { BaseEditor, Descendant, Editor, Element } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

// Define the custom editor type
export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

// Define element types
export type ParagraphElement = {
  type: 'paragraph';
  children: CustomText[];
};

export type HeadingOneElement = {
  type: 'heading-one';
  children: CustomText[];
};

export type HeadingTwoElement = {
  type: 'heading-two';
  children: CustomText[];
};

export type BulletedListElement = {
  type: 'bulleted-list';
  children: ListItemElement[];
};

export type NumberedListElement = {
  type: 'numbered-list';
  children: ListItemElement[];
};

export type ListItemElement = {
  type: 'list-item';
  children: CustomText[];
};

export type BlockQuoteElement = {
  type: 'block-quote';
  children: CustomText[];
};

export type CodeBlockElement = {
  type: 'code-block';
  children: CustomText[];
};

export type AlignedElement = {
  type: 'paragraph' | 'heading-one' | 'heading-two';
  align?: 'left' | 'center' | 'right';
  children: CustomText[];
};

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BulletedListElement
  | NumberedListElement
  | ListItemElement
  | BlockQuoteElement
  | CodeBlockElement;

// Define text formatting types
export type FormattedText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string; // For text color
};

export type CustomText = FormattedText;

// Extend Slate's types
declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Helper type for the editor value
export type SlateValue = Descendant[];

// Default initial value
export const createInitialValue = (): SlateValue => [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Element type guards
export const isBlockActive = (editor: CustomEditor, format: string) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: selection,
      match: (n) =>
        !Editor.isEditor(n) && Element.isElement(n) && n.type === format,
    })
  );

  return !!match;
};

// Mark type guards
export const isMarkActive = (
  editor: CustomEditor,
  format: keyof Omit<FormattedText, 'text'>
) => {
  const marks = editor.marks;
  return marks ? marks[format] === true : false;
};

