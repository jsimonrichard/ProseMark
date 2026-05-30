---
'@prosemark/core': patch
'@prosemark/latex': patch
---

Fix soft-indent layout on list lines with inline `$...$` math: only indent lines with real markdown prefixes, measure prefix width without compounding padding on edit, and align list lines with math to the same hanging indent as other list lines. Render inline MathJax with `display: inline` on soft-indented lines so negative `text-indent` does not push math farther right than plain list items.
