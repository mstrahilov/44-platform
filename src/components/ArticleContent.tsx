import DOMPurify from 'isomorphic-dompurify';
import { looksLikeHtml } from '@/lib/articles';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'strong', 'em', 'u', 's', 'code',
  'a',
  'ul', 'ol', 'li',
  'blockquote',
  'img',
  'figure', 'figcaption',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title'];

export function ArticleContent({ html }: { html: string | null | undefined }) {
  if (!html || html.trim() === '') {
    return null;
  }

  if (!looksLikeHtml(html)) {
    // Legacy plain-text content — preserve line breaks
    return (
      <div className="article-prose article-prose-plain">
        {html}
      </div>
    );
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target', 'rel'],
  });

  return (
    <div
      className="article-prose"
      // Sanitized above via DOMPurify with a strict allow-list
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
