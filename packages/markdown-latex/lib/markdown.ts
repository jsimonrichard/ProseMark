import type { InlineContext, MarkdownConfig } from '@lezer/markdown';

const isEscapedDollar = (cx: InlineContext, pos: number): boolean => {
  let backslashes = 0;
  for (let p = pos - 1; p >= cx.offset; p--) {
    if (cx.char(p) !== 92 /* \ */) break;
    backslashes++;
  }
  return backslashes % 2 === 1;
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

/**
 * Parses `$...$` inline math and optional `$$...$$` display math in Markdown
 * (TeX-style delimiters). A literal dollar is written as `\$`.
 */
export const markdownLatexMathSyntaxExtension: MarkdownConfig = {
  defineNodes: [
    { name: 'LatexMath' },
    { name: 'LatexMathMark' },
    { name: 'LatexMathFormula' },
  ],
  parseInline: [
    {
      name: 'LatexMath',
      parse: (cx: InlineContext, next: number, pos: number): number => {
        if (next !== 36 /* $ */) return -1;
        if (isEscapedDollar(cx, pos)) return -1;

        const display =
          pos + 1 < cx.end && cx.char(pos + 1) === 36 /* $ */;
        const contentFrom = display ? pos + 2 : pos + 1;
        const closePos = display
          ? findClosingDoubleDollar(cx, contentFrom)
          : findClosingSingleDollar(cx, contentFrom);
        if (closePos < 0) return -1;

        const contentTo = closePos;
        const outerTo = display ? closePos + 2 : closePos + 1;

        const openEnd = display ? pos + 2 : pos + 1;
        return cx.addElement(
          cx.elt('LatexMath', pos, outerTo, [
            cx.elt('LatexMathMark', pos, openEnd),
            cx.elt('LatexMathFormula', contentFrom, contentTo),
            cx.elt('LatexMathMark', contentTo, outerTo),
          ]),
        );
      },
      before: 'Escape',
    },
  ],
};
