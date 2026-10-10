import type { EditorState } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';

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

const isCloseTag = (tagText: string): boolean => tagText.startsWith('</');

const isSelfClosingOrVoidTag = (tagText: string): boolean => {
  if (/\/\s*>$/.test(tagText.trim())) return true;
  const name = /^<\s*([a-z][\w-]*)/i.exec(tagText)?.[1]?.toLowerCase();
  return name != null && VOID_TAG_NAMES.has(name);
};

/**
 * True when a markdown `Paragraph` contains only `HTMLTag` nodes and the text
 * outside those tags (at element depth 0) is whitespace — e.g. a lone
 * `<span>…</span>` or `<img …/>`, but not `Text <span>x</span>` or an Autolink.
 *
 * Uses the markdown syntax tree (no second HTML parse).
 */
export function isHtmlOnlyParagraph(
  state: EditorState,
  paragraph: SyntaxNodeRef,
): boolean {
  const tags: { from: number; to: number; text: string }[] = [];

  for (
    let child = paragraph.node.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (child.name !== 'HTMLTag') return false;
    tags.push({
      from: child.from,
      to: child.to,
      text: state.doc.sliceString(child.from, child.to),
    });
  }

  if (tags.length === 0) return false;

  let depth = 0;
  let pos = paragraph.from;

  for (const tag of tags) {
    const gap = state.doc.sliceString(pos, tag.from);
    if (depth === 0 && gap.trim() !== '') return false;

    if (isCloseTag(tag.text)) {
      depth -= 1;
      if (depth < 0) return false;
    } else if (!isSelfClosingOrVoidTag(tag.text)) {
      depth += 1;
    }

    pos = tag.to;
  }

  if (depth !== 0) return false;
  return state.doc.sliceString(pos, paragraph.to).trim() === '';
}
