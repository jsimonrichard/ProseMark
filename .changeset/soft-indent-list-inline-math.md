---
'@prosemark/core': patch
---

Fix soft-indent layout on list (and similar) lines that contain inline `$...$` math. Measure prefix width from the line box edge instead of `coordsAtPos(line.from)` (unstable with list-mark widgets), measure through the last prefix character, and omit negative `text-indent` on lines with inline math so MathJax inline-block widgets are not pulled into the hanging-indent margin.
