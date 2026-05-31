import type {
  BlockContext,
  InlineContext,
  Line,
  MarkdownConfig,
} from '@lezer/markdown';
import type { Input } from '@lezer/common';
import type { EditorState } from '@codemirror/state';
import { styleTags, Tag } from '@lezer/highlight';

/** Highlight tag for `$` / `$$` math delimiters. */
export const mathDelimiterTag = Tag.define();

/** Highlight tag for raw math source between delimiters. */
export const mathFormulaTag = Tag.define();

/** Whether a `Math` node is tight single-dollar inline math (not `$$` or padded `$ ... $`). */
export const isInlineMathNode = (
  state: EditorState,
  from: number,
  to: number,
): boolean => {
  const opensDouble = state.doc.sliceString(from, from + 2) === '$$';
  if (opensDouble) return false;
  const innerFrom = from + 1;
  const innerTo = to - 1;
  const body = state.doc.sliceString(innerFrom, innerTo);
  return !/^\s|\s$/.test(body);
};

const EMPTY_LINE = /^[ \t]*$/;

const isEscapedDollarAt = (text: string, pos: number): boolean => {
  let backslashes = 0;
  for (let p = pos - 1; p >= 0; p--) {
    if (text.charCodeAt(p) !== 92 /* \ */) break;
    backslashes++;
  }
  return backslashes % 2 === 1;
};

const isEscapedDollar = (cx: InlineContext, pos: number): boolean => {
  let backslashes = 0;
  for (let p = pos - 1; p >= cx.offset; p--) {
    if (cx.char(p) !== 92 /* \ */) break;
    backslashes++;
  }
  return backslashes % 2 === 1;
};

const findClosingDoubleDollarInText = (text: string, from: number): number => {
  for (let pos = from; pos < text.length - 1; pos++) {
    if (text.charCodeAt(pos) !== 36 /* $ */) continue;
    if (text.charCodeAt(pos + 1) !== 36 /* $ */) continue;
    if (isEscapedDollarAt(text, pos)) continue;
    return pos;
  }
  return -1;
};

const findClosingDoubleDollar = (cx: InlineContext, from: number): number => {
  for (let pos = from; pos < cx.end - 1; pos++) {
    if (cx.char(pos) === 36 /* $ */ && cx.char(pos + 1) === 36 /* $ */) {
      if (!isEscapedDollar(cx, pos)) return pos;
    }
  }
  return -1;
};

const findClosingSingleDollar = (cx: InlineContext, from: number): number => {
  for (let pos = from; pos < cx.end; pos++) {
    if (cx.char(pos) !== 36 /* $ */) continue;
    if (isEscapedDollar(cx, pos)) continue;
    return pos;
  }
  return -1;
};

const startsWithDoubleDollar = (line: Line): boolean => {
  if (line.next !== 36 /* $ */) return false;
  if (line.pos + 1 >= line.text.length) return false;
  return line.text.charCodeAt(line.pos + 1) === 36; /* $ */
};

const hasBlankLineBeforeClosingDoubleDollar = (
  cx: BlockContext,
  afterOpeningPos: number,
): boolean => {
  const input = (cx as unknown as { input?: Input }).input;
  if (!input) return false;

  const rest = input.read(afterOpeningPos, input.length);
  let sawBlankLine = false;
  let sawContent = false;

  for (const currentLine of rest.split('\n')) {
    if (findClosingDoubleDollarInText(currentLine, 0) >= 0) {
      return sawBlankLine;
    }
    if (EMPTY_LINE.test(currentLine)) {
      if (sawContent) sawBlankLine = true;
    } else {
      sawContent = true;
    }
  }

  // Unclosed display math should also continue past blank lines.
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

const buildMathElement = (
  cx: BlockContext,
  from: number,
  outerTo: number,
  contentFrom: number,
  contentTo: number,
) => {
  const openEnd = from + 2;
  return cx.elt('Math', from, outerTo, [
    cx.elt('MathMark', from, openEnd),
    cx.elt('MathFormula', contentFrom, contentTo),
    cx.elt('MathMark', contentTo, outerTo),
  ]);
};

/**
 * `$...$` and `$$...$$` math delimiters (TeX-style). A literal dollar is `\$`.
 *
 * Display math with blank lines inside is parsed as a block-level **`Math`** node
 * (see `parseBlock`). Other `$$...$$` spans use `parseInline` inside a paragraph.
 *
 * The outer node is **`Math`** so the same tree can be used with LaTeX (MathJax),
 * Typst, or other renderers in `@prosemark/*` packages.
 */
export const mathMarkdownSyntaxExtension: MarkdownConfig = {
  defineNodes: [
    { name: 'Math', block: true },
    { name: 'MathMark' },
    { name: 'MathFormula' },
  ],
  props: [
    styleTags({
      MathMark: mathDelimiterTag,
      MathFormula: mathFormulaTag,
    }),
  ],
  parseBlock: [
    {
      name: 'MultiLineMathBlock',
      before: 'HTMLBlock',
      parse: (cx: BlockContext, line: Line): boolean => {
        if (!startsWithDoubleDollar(line)) return false;

        const openingPos = cx.lineStart + line.pos;
        if (isEscapedDollarAt(line.text, line.pos)) return false;

        const contentFrom = openingPos + 2;
        if (!hasBlankLineBeforeClosingDoubleDollar(cx, contentFrom)) {
          return false;
        }

        const from = openingPos;
        let contentTo = contentFrom;
        let outerTo = contentFrom;
        let foundClosing = false;

        const closeOnLine = findClosingDoubleDollarInText(
          line.text.slice(line.pos + 2),
          0,
        );
        if (closeOnLine >= 0) {
          contentTo = cx.lineStart + line.pos + 2 + closeOnLine;
          outerTo = contentTo + 2;
          foundClosing = true;
        }

        while (!foundClosing && cx.nextLine()) {
          if (leftCurrentCompositeContext(cx, line)) break;

          const closePos = findClosingDoubleDollarInText(line.text, 0);
          if (closePos >= 0) {
            contentTo = cx.lineStart + closePos;
            outerTo = contentTo + 2;
            foundClosing = true;
            break;
          }
        }

        if (foundClosing) {
          cx.nextLine();
        }

        cx.addElement(
          buildMathElement(cx, from, outerTo, contentFrom, contentTo),
        );
        return true;
      },
    },
  ],
  parseInline: [
    {
      name: 'Math',
      parse: (cx: InlineContext, next: number, pos: number): number => {
        if (next !== 36 /* $ */) return -1;
        if (isEscapedDollar(cx, pos)) return -1;

        const display = pos + 1 < cx.end && cx.char(pos + 1) === 36; /* $ */
        const contentFrom = display ? pos + 2 : pos + 1;
        const closePos = display
          ? findClosingDoubleDollar(cx, contentFrom)
          : findClosingSingleDollar(cx, contentFrom);
        if (closePos < 0) return -1;

        const contentTo = closePos;
        const outerTo = display ? closePos + 2 : closePos + 1;

        const openEnd = display ? pos + 2 : pos + 1;
        return cx.addElement(
          cx.elt('Math', pos, outerTo, [
            cx.elt('MathMark', pos, openEnd),
            cx.elt('MathFormula', contentFrom, contentTo),
            cx.elt('MathMark', contentTo, outerTo),
          ]),
        );
      },
      before: 'Escape',
    },
  ],
};
