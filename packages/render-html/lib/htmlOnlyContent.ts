const VOID_TAG_NAMES = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const TAG_NAME = /^[a-z][\w-]*$/i;

/**
 * True when `text` is only HTML tags (plus text/whitespace inside or between
 * them) — e.g. `<span>hi</span>` or `<img src="x.png" />`, but not
 * `Text <span>x</span>` or markdown autolinks like `<https://example.com>`.
 */
export function isHtmlOnlyContent(text: string): boolean {
  const s = text.trim();
  if (!s.startsWith('<')) return false;

  let i = 0;
  let depth = 0;
  let sawTag = false;

  while (i < s.length) {
    if (s[i] === '<') {
      if (s.startsWith('<!--', i)) {
        const end = s.indexOf('-->', i + 4);
        if (end === -1) return false;
        sawTag = true;
        i = end + 3;
        continue;
      }

      const close = s.indexOf('>', i + 1);
      if (close === -1) return false;
      const rawTag = s.slice(i, close + 1);
      const isClose = rawTag.startsWith('</');
      const isSelfClosing = /\/\s*>$/.test(rawTag);
      const nameMatch = /^<\/?\s*([a-z][\w-]*)/i.exec(rawTag);
      if (!nameMatch?.[1] || !TAG_NAME.test(nameMatch[1])) return false;

      // Reject autolink-shaped markup: `<https://…>` / `<foo@bar.com>`
      const afterName = rawTag.slice(nameMatch[0].length);
      if (!isClose && !/^[\s/>]/.test(afterName) && afterName.length > 0) {
        return false;
      }

      const tagName = nameMatch[1].toLowerCase();
      sawTag = true;

      if (isClose) {
        depth -= 1;
        if (depth < 0) return false;
      } else if (!isSelfClosing && !VOID_TAG_NAMES.has(tagName)) {
        depth += 1;
      }

      i = close + 1;
      continue;
    }

    const nextTag = s.indexOf('<', i);
    const chunkEnd = nextTag === -1 ? s.length : nextTag;
    const chunk = s.slice(i, chunkEnd);
    if (depth === 0 && chunk.trim() !== '') return false;
    i = chunkEnd;
  }

  return sawTag && depth === 0;
}
