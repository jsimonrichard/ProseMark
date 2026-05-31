---
'@prosemark/core': patch
'@prosemark/latex': patch
---

Fix soft-indent layout when inline `$...$` math appears on list, blockquote, task, or indented lines.

`@prosemark/core` exports `isInlineMathNode`, `matchSoftIndentPrefix`, `softIndentPrefixBounds`, `measureSoftIndentWidth`, `softIndentMeasurePos` (deprecated), and `SOFT_INDENT_LINE_CLASS`. Soft-indented lines get class `cm-soft-indent-line`.

`@prosemark/latex` renders inline math as `display: inline` on `cm-soft-indent-line` so hanging indent does not misplace MathJax widgets.
