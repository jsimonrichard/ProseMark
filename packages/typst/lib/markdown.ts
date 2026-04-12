/**
 * Math delimiters live in `@prosemark/core` as `Math` / `MathMark` / `MathFormula`
 * and are included in `prosemarkMarkdownSyntaxExtensions`. Re-export under
 * `typstMath*` names for consumers who only install `@prosemark/typst`.
 */
export {
  mathDelimiterTag as typstMathDelimiterTag,
  mathFormulaTag as typstMathFormulaTag,
  mathMarkdownSyntaxExtension as typstMathMarkdownSyntaxExtension,
} from '@prosemark/core';
