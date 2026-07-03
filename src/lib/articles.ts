export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function estimateReadTime(html: string | null | undefined, wpm = 200): number {
  const text = stripHtml(html);
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
