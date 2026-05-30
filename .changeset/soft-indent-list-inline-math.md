---
'@prosemark/core': patch
---

Fix soft-indent layout on list (and similar) lines that contain inline `$...$` math. Only apply soft indent when the line has a real markdown prefix (blockquote, leading space/tab, or list/task marker), not on plain paragraphs. Measure prefix width with stable `coordsAtPos` deltas so padding does not compound on click/edit. Omit negative `text-indent` on lines with inline math so MathJax widgets stay aligned.
