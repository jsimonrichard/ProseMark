---
'@prosemark/core': patch
---

Fix soft-indent measurement on list lines when inline math immediately follows the list marker. Measure through the last prefix character instead of the position after the prefix, which could sit on a MathJax replace widget and inflate hanging indent.
