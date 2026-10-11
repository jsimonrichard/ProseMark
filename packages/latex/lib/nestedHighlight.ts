import {
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
} from '@codemirror/language';
import { stex, stexMath } from '@codemirror/legacy-modes/mode/stex';
import { parseMixed } from '@lezer/common';
import type { MarkdownConfig } from '@lezer/markdown';

/** Stream language for TeX math mode (`stexMath` from `@codemirror/legacy-modes`). */
export const latexMathStreamLanguage = StreamLanguage.define(stexMath);

/** Stream language for document TeX (`stex` from `@codemirror/legacy-modes`). */
export const latexStreamLanguage = StreamLanguage.define(stex);

/**
 * Mount stexMath on MathFormula, skipping leading/trailing newlines.
 * StreamLanguage + stexMath drops identifier tokens when the overlay buffer
 * starts with a newline (multi-line `$$` blocks), so trim those edges.
 */
const latexMathNestedMixedParser = parseMixed((node, input) => {
  if (node.name !== 'Math') return null;

  let formulaFrom = -1;
  let formulaTo = -1;
  for (let child = node.node.firstChild; child; child = child.nextSibling) {
    if (child.name !== 'MathFormula') continue;
    formulaFrom = child.from;
    formulaTo = child.to;
    break;
  }
  if (formulaFrom < 0) return null;

  let from = formulaFrom;
  let to = formulaTo;
  while (from < to) {
    const ch = input.read(from, from + 1);
    if (ch !== '\n' && ch !== '\r') break;
    from++;
  }
  while (to > from) {
    const ch = input.read(to - 1, to);
    if (ch !== '\n' && ch !== '\r') break;
    to--;
  }
  if (from >= to) return null;

  return {
    parser: latexMathStreamLanguage.parser,
    overlay: [{ from, to }],
  };
});

/**
 * Nested `stexMath` highlighting inside core **`MathFormula`** nodes
 * (`$...$` / `$$...$$`).
 *
 * Add next to {@link latexMathMarkdownSyntaxExtension} /
 * `mathMarkdownSyntaxExtension` / `prosemarkMarkdownSyntaxExtensions` in
 * `markdown({ extensions: [...] })`. Same `parseMixed` shape as core YAML
 * frontmatter.
 */
export const latexMathNestedHighlightExtension: MarkdownConfig = {
  wrap: latexMathNestedMixedParser,
};

/**
 * `LanguageDescription` for fenced ` ```latex ` / ` ```tex ` / ` ```stex `
 * blocks. Pass to `markdown({ codeLanguages: [...] })` (alone or alongside
 * `@codemirror/language-data`’s `languages`, which already includes LaTeX).
 */
export const latexLanguageDescription = LanguageDescription.of({
  name: 'LaTeX',
  alias: ['latex', 'tex', 'stex'],
  extensions: ['tex', 'ltx', 'latex'],
  support: new LanguageSupport(latexStreamLanguage),
});
