---
"@prosemark/render-html": patch
---

Render folded HTML blocks as **block** replace widgets: outer `.cm-html-widget` uses padding (no vertical margin), inner `.cm-html-widget__content` uses `display: flow-root` to contain margins from rendered content. Call `requestMeasure` after DOM updates and on `ResizeObserver` resize. Set `proseMarkSkipAdjacentArrowReveal` on the decoration so arrow movement through blank lines after a block behaves normally (with `revealBlockOnArrowExtension` in core).
