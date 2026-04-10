/**
 * Math delimiters live in `@prosemark/core` as `Math` / `MathMark` / `MathFormula`
 * and are included in `prosemarkMarkdownSyntaxExtensions`. Re-export under
 * `latex*` names for consumers who only install `@prosemark/latex`.
 */
export {
  proseMathDelimiterTag as latexMathDelimiterTag,
  proseMathFormulaTag as latexMathFormulaTag,
  proseMathMarkdownSyntaxExtension as latexMathMarkdownSyntaxExtension,
} from '@prosemark/core';
