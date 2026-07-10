'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import DOMPurify from 'isomorphic-dompurify';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';

type Props = {
  value: string;
  onChange: (html: string) => void;
  userId: string;
  placeholder?: string;
  disabled?: boolean;
};

const SANITIZE_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'strong', 'em', 'u', 's', 'code', 'mark',
  'span',
  'a',
  'ul', 'ol', 'li',
  'blockquote',
  'img',
];
const SANITIZE_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class'];

function sanitizeHtml(html: string): string {
  return String(DOMPurify.sanitize(html, {
    ALLOWED_TAGS: SANITIZE_TAGS,
    ALLOWED_ATTR: SANITIZE_ATTR,
    ALLOWED_CSS_PROPERTIES: ['color', 'background-color'],
  } as never));
}

const TEXT_COLORS = [
  { name: 'Default',  value: '' },
  { name: 'Purple',   value: '#8b5cf6' },
  { name: 'Blue',     value: '#3b82f6' },
  { name: 'Green',    value: '#10b981' },
  { name: 'Amber',    value: '#f59e0b' },
  { name: 'Red',      value: '#ef4444' },
  { name: 'Pink',     value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None',   value: '' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Green',  value: '#d1fae5' },
  { name: 'Blue',   value: '#dbeafe' },
  { name: 'Pink',   value: '#fce7f3' },
  { name: 'Purple', value: '#ede9fe' },
];

export function RichEditor({ value, onChange, userId, placeholder, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [openMenu, setOpenMenu] = useState<'color' | 'highlight' | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ImageExtension,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeHtml(ed.getHTML()));
    },
    editorProps: {
      attributes: { class: 'rich-editor-content' },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled && !uploading);
  }, [editor, disabled, uploading]);

  // Close popover on outside click
  useEffect(() => {
    if (!openMenu) return;
    function handler(event: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  if (!editor) {
    return <div className="rich-editor rich-editor-loading" aria-hidden="true" />;
  }

  async function handleImageInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadPublicFile({ file, folder: 'editor/content', userId });
      editor.chain().focus().setImage({ src: result.publicUrl, alt: file.name }).run();
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function promptLink() {
    if (!editor) return;
    const existing = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', existing || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function applyColor(color: string) {
    if (!editor) return;
    if (!color) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(color).run();
    setOpenMenu(null);
  }

  function applyHighlight(color: string) {
    if (!editor) return;
    if (!color) editor.chain().focus().unsetHighlight().run();
    else editor.chain().focus().setHighlight({ color }).run();
    setOpenMenu(null);
  }

  const isEmpty = editor.isEmpty;
  const currentColor = (editor.getAttributes('textStyle').color as string) || '';
  const currentHighlight = (editor.getAttributes('highlight').color as string) || '';

  return (
    <div className={disabled ? 'rich-editor rich-editor-disabled' : 'rich-editor'} ref={wrapRef}>
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatting">
        <div className="rich-editor-toolbar-group">
          <ToolbarButton editor={editor} action="heading2" title="Section heading">
            <IconHeading level={2} />
          </ToolbarButton>
          <ToolbarButton editor={editor} action="heading3" title="Subheading">
            <IconHeading level={3} />
          </ToolbarButton>
        </div>

        <span className="rich-editor-toolbar-sep" aria-hidden="true" />

        <div className="rich-editor-toolbar-group">
          <ToolbarButton editor={editor} action="bold" title="Bold">
            <IconBold />
          </ToolbarButton>
          <ToolbarButton editor={editor} action="italic" title="Italic">
            <IconItalic />
          </ToolbarButton>
          <button
            type="button"
            className={editor.isActive('link') ? 'rich-editor-toolbar-button rich-editor-toolbar-button-active' : 'rich-editor-toolbar-button'}
            onClick={promptLink}
            title="Link"
            aria-label="Insert link"
          >
            <IconLink />
          </button>
        </div>

        <span className="rich-editor-toolbar-sep" aria-hidden="true" />

        <div className="rich-editor-toolbar-group">
          <div className="rich-editor-toolbar-popover">
            <button
              type="button"
              className="rich-editor-toolbar-button"
              onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
              title="Text color"
              aria-label="Text color"
              aria-expanded={openMenu === 'color'}
            >
              <IconTextColor color={currentColor} />
            </button>
            {openMenu === 'color' && (
              <div className="rich-editor-toolbar-menu" role="menu">
                <div className="rich-editor-toolbar-menu-label">Text color</div>
                <div className="rich-editor-toolbar-swatches">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c.value || 'default'}
                      type="button"
                      className={c.value === currentColor ? 'rich-editor-swatch rich-editor-swatch-active' : 'rich-editor-swatch'}
                      style={c.value ? { background: c.value } : undefined}
                      onClick={() => applyColor(c.value)}
                      title={c.name}
                      aria-label={c.name}
                    >
                      {!c.value && <span aria-hidden="true">×</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rich-editor-toolbar-popover">
            <button
              type="button"
              className={currentHighlight ? 'rich-editor-toolbar-button rich-editor-toolbar-button-active' : 'rich-editor-toolbar-button'}
              onClick={() => setOpenMenu(openMenu === 'highlight' ? null : 'highlight')}
              title="Highlight"
              aria-label="Highlight"
              aria-expanded={openMenu === 'highlight'}
            >
              <IconHighlight color={currentHighlight} />
            </button>
            {openMenu === 'highlight' && (
              <div className="rich-editor-toolbar-menu" role="menu">
                <div className="rich-editor-toolbar-menu-label">Highlight</div>
                <div className="rich-editor-toolbar-swatches">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.value || 'none'}
                      type="button"
                      className={c.value === currentHighlight ? 'rich-editor-swatch rich-editor-swatch-active' : 'rich-editor-swatch'}
                      style={c.value ? { background: c.value } : undefined}
                      onClick={() => applyHighlight(c.value)}
                      title={c.name}
                      aria-label={c.name}
                    >
                      {!c.value && <span aria-hidden="true">×</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <span className="rich-editor-toolbar-sep" aria-hidden="true" />

        <div className="rich-editor-toolbar-group">
          <ToolbarButton editor={editor} action="bulletList" title="Bullet list">
            <IconBulletList />
          </ToolbarButton>
          <ToolbarButton editor={editor} action="orderedList" title="Numbered list">
            <IconOrderedList />
          </ToolbarButton>
          <ToolbarButton editor={editor} action="blockquote" title="Quote">
            <IconQuote />
          </ToolbarButton>
          <ToolbarButton editor={editor} action="hr" title="Divider">
            <IconRule />
          </ToolbarButton>
        </div>

        <span className="rich-editor-toolbar-sep" aria-hidden="true" />

        <label className="rich-editor-toolbar-button rich-editor-toolbar-image" title="Insert image">
          {uploading ? <span className="rich-editor-toolbar-uploading">Uploading…</span> : <IconImage />}
          <input type="file" accept="image/*" onChange={handleImageInput} disabled={uploading} />
        </label>
      </div>

      <div className="rich-editor-surface" data-empty={isEmpty ? 'true' : 'false'} data-placeholder={placeholder ?? ''}>
        <EditorContent editor={editor} />
      </div>

      {error && <div className="dashboard-status dashboard-status-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}

function ToolbarButton({
  editor,
  action,
  title,
  children,
}: {
  editor: Editor;
  action: 'heading2' | 'heading3' | 'bold' | 'italic' | 'bulletList' | 'orderedList' | 'blockquote' | 'hr';
  title: string;
  children: React.ReactNode;
}) {
  const activeMap: Record<typeof action, boolean> = {
    heading2:    editor.isActive('heading', { level: 2 }),
    heading3:    editor.isActive('heading', { level: 3 }),
    bold:        editor.isActive('bold'),
    italic:      editor.isActive('italic'),
    bulletList:  editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    blockquote:  editor.isActive('blockquote'),
    hr:          false,
  };
  const active = activeMap[action];

  function run() {
    switch (action) {
      case 'heading2':    editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':    editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bold':        editor.chain().focus().toggleBold().run(); break;
      case 'italic':      editor.chain().focus().toggleItalic().run(); break;
      case 'bulletList':  editor.chain().focus().toggleBulletList().run(); break;
      case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break;
      case 'blockquote':  editor.chain().focus().toggleBlockquote().run(); break;
      case 'hr':          editor.chain().focus().setHorizontalRule().run(); break;
    }
  }

  return (
    <button
      type="button"
      className={active ? 'rich-editor-toolbar-button rich-editor-toolbar-button-active' : 'rich-editor-toolbar-button'}
      onClick={run}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/* ── Icons ─────────────────────────────────────────────── */

function IconHeading({ level }: { level: 2 | 3 }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M14 5v14M6 12h8" />
      <text x="17" y="19" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">{level}</text>
    </svg>
  );
}
function IconBold() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" />
    </svg>
  );
}
function IconItalic() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 5l-4 14M9 5h8M7 19h8" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
    </svg>
  );
}
function IconBulletList() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="7"  r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="17" r="1" fill="currentColor" />
      <path d="M10 7h10M10 12h10M10 17h10" />
    </svg>
  );
}
function IconOrderedList() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 7h10M10 12h10M10 17h10" />
      <text x="3" y="9"  fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">1</text>
      <text x="3" y="14" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">2</text>
      <text x="3" y="19" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">3</text>
    </svg>
  );
}
function IconQuote() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10c0-2 2-4 4-4v2c-1 0-2 1-2 2v2h3v6H6zM14 10c0-2 2-4 4-4v2c-1 0-2 1-2 2v2h3v6h-5z" />
    </svg>
  );
}
function IconRule() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 12h16" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </svg>
  );
}
function IconTextColor({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18L10 5h4l5 13M7.5 14h9" />
      <rect x="5" y="20" width="14" height="2.4" rx="1" fill={color || 'currentColor'} stroke="none" />
    </svg>
  );
}
function IconHighlight({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="12" width="12" height="6" rx="1" fill={color || 'transparent'} stroke="currentColor" />
      <path d="M14 6l4 4-6 6" />
    </svg>
  );
}
