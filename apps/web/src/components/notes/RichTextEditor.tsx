import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bold, Italic, Strikethrough, List, ListOrdered, Code, Quote, Heading1, Heading2, Heading3 } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none',
          'focus:outline-none min-h-[500px] pt-0 pb-8',
          'text-lg sm:text-xl leading-relaxed text-gray-800 dark:text-gray-200',
          '[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:text-gray-300 dark:[&_.is-editor-empty:first-child::before]:text-gray-700 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
          '[&_p]:my-4 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:mb-8',
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4',
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3',
          '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4',
          '[&_li]:my-1 [&_li_p]:my-0',
          '[&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-primary',
          '[&_pre]:bg-gray-950 [&_pre]:text-gray-100 [&_pre]:p-6 [&_pre]:rounded-2xl [&_pre]:my-6 [&_pre]:shadow-lg [&_pre]:border [&_pre]:border-white/5',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-primary/20 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-gray-500 dark:text-gray-400 [&_blockquote]:my-8'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor content in sync with props
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Small optimization: only set content if the editor isn't focused
      // to avoid jumping the cursor while the user is typing
      if (!editor.isFocused) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  // Handle dynamic editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Refined Toolbar */}
      {editable && (
        <TooltipProvider>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 mb-3 pb-3 border-b border-gray-100 dark:border-gray-850 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 overflow-x-auto overflow-y-hidden no-scrollbar">
            <div className="flex items-center gap-1 p-1 bg-gray-50/50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-850 flex-shrink-0">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                tooltip="Bold"
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                tooltip="Italic"
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
                tooltip="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <div className="h-6 w-px bg-gray-100 dark:border-gray-850 mx-1 flex-shrink-0" />

            <div className="flex items-center gap-1 p-1 bg-gray-50/50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-850 flex-shrink-0">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                tooltip="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                tooltip="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                tooltip="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <div className="h-6 w-px bg-gray-100 dark:border-gray-850 mx-1 flex-shrink-0" />

            <div className="flex items-center gap-1 p-1 bg-gray-50/50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-850 flex-shrink-0">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                tooltip="Bullet List"
              >
                <List className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                tooltip="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <div className="h-6 w-px bg-gray-100 dark:border-gray-850 mx-1 flex-shrink-0" />

            <div className="flex items-center gap-1 p-1 bg-gray-50/50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-850 flex-shrink-0">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                active={editor.isActive('codeBlock')}
                tooltip="Code Block"
              >
                <Code className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                tooltip="Quote"
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>
        </TooltipProvider>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, tooltip, children }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            "h-8 w-8 rounded-lg transition-all duration-200",
            active
              ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-850"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  );
}
