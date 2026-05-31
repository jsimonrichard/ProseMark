/**
 * Math delimiters live in `@prosemark/core` as `Math` / `MathMark` / `MathFormula`
 * and are included in `prosemarkMarkdownSyntaxExtensions`. For now, `latex*`
 * exports are direct aliases of the core symbols so LaTeX apps can import parser
 * and renderer from one package; they are the extension point if LaTeX-specific
 * parsing ever diverges from other `@prosemark/*` math backends.
 */
export {
  mathDelimiterTag as latexMathDelimiterTag,
  mathFormulaTag as latexMathFormulaTag,
  mathMarkdownSyntaxExtension as latexMathMarkdownSyntaxExtension,
} from '@prosemark/core';
