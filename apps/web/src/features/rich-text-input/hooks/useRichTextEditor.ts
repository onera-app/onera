import { useCallback } from 'react';
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import type { SuggestionOptions } from '@tiptap/suggestion';

interface UseRichTextEditorOptions {
  placeholder?: string;
  onSubmit?: () => void;
  mentionSuggestion?: Partial<SuggestionOptions>;
}

interface UseRichTextEditorReturn {
  editor: Editor | null;
  getPlainText: () => string;
  getHTML: () => string;
  getMarkdown: () => string;
  isEmpty: () => boolean;
  clear: () => void;
  focus: () => void;
}

/**
 * Hook for managing TipTap rich text editor
 */
export function useRichTextEditor({
  placeholder = 'Type a message...',
  onSubmit,
  mentionSuggestion,
}: UseRichTextEditorOptions = {}): UseRichTextEditorReturn {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading since we're in chat context
        heading: false,
        // Enable hard break for Shift+Enter
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      // Add mention extension if suggestion config provided
      ...(mentionSuggestion
        ? [
            Mention.configure({
              HTMLAttributes: {
                class: 'mention',
              },
              suggestion: mentionSuggestion as SuggestionOptions,
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        // Submit on Enter (without shift)
        if (event.key === 'Enter' && !event.shiftKey) {
          // Don't submit if suggestions are visible
          const suggestionPopup = document.querySelector('.tippy-box');
          if (suggestionPopup) {
            return false;
          }
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
  });

  const getPlainText = useCallback((): string => {
    if (!editor) return '';
    return editor.getText();
  }, [editor]);

  const getHTML = useCallback((): string => {
    if (!editor) return '';
    return editor.getHTML();
  }, [editor]);

  const getMarkdown = useCallback((): string => {
    if (!editor) return '';
    // Simple HTML to markdown conversion for chat context
    // Just extract text, preserving code blocks
    const html = editor.getHTML();

    // Convert code blocks
    let markdown = html
      .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n')
      .replace(/<[^>]+>/g, '') // Strip remaining tags
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .trim();

    return markdown;
  }, [editor]);

  const isEmpty = useCallback((): boolean => {
    if (!editor) return true;
    return editor.isEmpty;
  }, [editor]);

  const clear = useCallback(() => {
    editor?.commands.clearContent();
  }, [editor]);

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  return {
    editor,
    getPlainText,
    getHTML,
    getMarkdown,
    isEmpty,
    clear,
    focus,
  };
}
