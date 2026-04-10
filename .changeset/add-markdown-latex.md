---
'@prosemark/core': minor
'@prosemark/latex': patch
---

Add **`proseMathMarkdownSyntaxExtension`** to `@prosemark/core`: Lezer nodes **`Math`**, **`MathMark`**, **`MathFormula`** for `$...$` / `$$...$$`, exported tags **`proseMathDelimiterTag`** / **`proseMathFormulaTag`**, included in **`prosemarkMarkdownSyntaxExtensions`**. Add **`@lezer/highlight`** as a core dependency.

Add **`@prosemark/latex`**: MathJax widgets for those **`Math`** nodes, delimiter/formula highlighting theme, optional LRU render cache, **`requestMeasure`** / **`ResizeObserver`** for block math. Re-export the syntax as **`latexMath*`** for consumers who only install latex. Hybrid display rules: `$$...$$` always block; padded single-dollar block; tight single-dollar inline.

Skip adjacent-line arrow jumps for math replace widgets (`proseMarkSkipAdjacentArrowReveal`) so moving up through blank lines after math behaves normally.

Rebuild the fold gutter when geometry changes (`foldGutter({ foldingChanged: (u) => u.geometryChanged })`) so async block-widget height updates do not leave fold markers misaligned with lines.
