---
'@prosemark/core': patch
'@prosemark/latex': patch
---

Add `@prosemark/latex` with Lezer `$...$` / `$$...$$` LaTeX math syntax, delimiter/formula highlighting, MathJax from the `mathjax` npm package (dynamic import), optional LRU render cache, and `requestMeasure` for display math.

Skip adjacent-line arrow jumps for LaTeX replace widgets (`proseMarkSkipAdjacentArrowReveal`) so moving up through blank lines after math behaves normally.
