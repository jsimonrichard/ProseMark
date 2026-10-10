---
'@prosemark/render-html': patch
---

Render HTML-only paragraphs by folding `Paragraph` nodes that contain only `HTMLTag` children, instead of re-parsing or promoting them to `HTMLBlock`.
