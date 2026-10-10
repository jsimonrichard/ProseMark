---
'@prosemark/render-html': patch
---

Treat HTML-only paragraphs (e.g. a lone `<span>` or `<a>`) as `HTMLBlock`s and wrap inline roots in a `<div>` so they render through the existing HTML widget path.
