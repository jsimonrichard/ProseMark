/** CommonMark style-6 block tags plus a few other block-level roots. */
const BLOCK_LEVEL_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'iframe',
  'legend',
  'li',
  'main',
  'menu',
  'menuitem',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'ul',
]);

/**
 * True when sanitized HTML roots are phrasing/inline (or empty) and should be
 * wrapped in a `<div>` before mounting in the block widget.
 */
export function htmlBlockNeedsDivWrapper(root: ParentNode): boolean {
  const elements = [...root.children];
  if (elements.length === 0) {
    return (root.textContent?.trim().length ?? 0) > 0;
  }
  return elements.some((el) => !BLOCK_LEVEL_TAGS.has(el.tagName.toLowerCase()));
}
