---
'@prosemark/core': patch
'@prosemark/latex': patch
---

Fix soft-indent layout when inline `$...$` math appears on list, blockquote, task, or indented lines.

`@prosemark/latex` renders inline math as `display: inline` on `cm-soft-indent-line` so hanging indent does not misplace MathJax widgets.
