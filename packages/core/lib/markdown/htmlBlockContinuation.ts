import type { Input } from '@lezer/common';
import type { BlockContext, Line, MarkdownConfig } from '@lezer/markdown';

const EMPTY_LINE = /^[ \t]*$/;
const STYLE_1_TAG_NAMES = new Set(['script', 'pre', 'style']);
const STYLE_6_BLOCK_TAGS =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul';
const STYLE_6_OPENING_TAG = new RegExp(
  `^\\s*<(?:${STYLE_6_BLOCK_TAGS})(?:\\s|/?>|$)`,
  'i',
);
const STYLE_7_OPENING_TAG =
  /^\s*<[a-z][\w-]*(?:\s+[a-z:_][\w-.]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*>\s*$/i;
const OPENING_TAG = /^\s*<([a-z][\w-]*)(?=[\s/>]|$)/i;
const OPENING_TAG_TOKEN = /^\s*<[^>]*>/;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractOpeningTagName = (lineText: string): string | null => {
  const match = OPENING_TAG.exec(lineText);
  if (!match) return null;
  const tagName = match[1];
  if (!tagName) return null;
  return tagName.toLowerCase();
};

const isSelfClosingOpeningTag = (lineText: string): boolean => {
  const openingTagToken = OPENING_TAG_TOKEN.exec(lineText)?.[0];
  if (!openingTagToken) return false;
  return /\/\s*>$/.test(openingTagToken.trim());
};

const updateTagDepth = (
  depth: number,
  lineText: string,
  tagName: string,
): number => {
  const sameTagRegex = new RegExp(
    `<\\/?${escapeRegExp(tagName)}(?=[\\s/>]|$)[^>]*>`,
    'gi',
  );

  for (const tagMatch of lineText.matchAll(sameTagRegex)) {
    const tag = tagMatch[0];
    if (tag.startsWith('</')) {
      depth -= 1;
      continue;
    }
    if (/\/\s*>$/.test(tag)) {
      continue;
    }
    depth += 1;
  }

  return depth;
};

const startsAsStyle6OrStyle7HtmlBlock = (lineText: string): boolean =>
  STYLE_6_OPENING_TAG.test(lineText) || STYLE_7_OPENING_TAG.test(lineText);

const hasBlankLineBeforeClosingTag = (
  cx: BlockContext,
  startPos: number,
  tagName: string,
): boolean => {
  const input = (cx as unknown as { input?: Input }).input;
  if (!input) return false;

  const rest = input.read(startPos, input.length);
  let depth = 0;
  let sawBlankLine = false;

  for (const currentLine of rest.split('\n')) {
    depth = updateTagDepth(depth, currentLine, tagName);
    if (depth <= 0) return sawBlankLine;
    if (EMPTY_LINE.test(currentLine)) sawBlankLine = true;
  }

  // Unclosed tags should also continue past blank lines.
  return sawBlankLine;
};

const leftCurrentCompositeContext = (cx: BlockContext, line: Line): boolean => {
  const lineDepth = (line as unknown as { depth?: number }).depth;
  const stackLength = (cx as unknown as { stack?: unknown[] }).stack?.length;
  return (
    typeof lineDepth === 'number' &&
    typeof stackLength === 'number' &&
    lineDepth < stackLength
  );
};

export const htmlBlockContinuationMarkdownSyntaxExtension: MarkdownConfig = {
  parseBlock: [
    {
      name: 'HTMLBlockContinuation',
      before: 'HTMLBlock',
      parse: (cx: BlockContext, line: Line): boolean => {
        if (line.next !== 60 /* < */) return false;

        const currentLineText = line.text.slice(line.pos);
        const openingTagName = extractOpeningTagName(currentLineText);
        if (!openingTagName || STYLE_1_TAG_NAMES.has(openingTagName)) {
          return false;
        }
        if (!startsAsStyle6OrStyle7HtmlBlock(currentLineText)) return false;
        if (isSelfClosingOpeningTag(currentLineText)) return false;
        if (
          !hasBlankLineBeforeClosingTag(
            cx,
            cx.lineStart + line.pos,
            openingTagName,
          )
        ) {
          return false;
        }

        let tagDepth = updateTagDepth(0, currentLineText, openingTagName);
        if (tagDepth <= 0) return false;

        const from = cx.lineStart + line.pos;
        let foundClosingTag = false;

        while (tagDepth > 0 && cx.nextLine()) {
          if (leftCurrentCompositeContext(cx, line)) break;
          tagDepth = updateTagDepth(tagDepth, line.text, openingTagName);
        }

        if (tagDepth <= 0) {
          foundClosingTag = true;
        }

        if (foundClosingTag) {
          cx.nextLine();
        }

        cx.addElement(cx.elt('HTMLBlock', from, cx.prevLineEnd()));
        return true;
      },
    },
  ],
};
