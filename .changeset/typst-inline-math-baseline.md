---
'@prosemark/typst': patch
---

Align inline Typst math with surrounding text by removing extra typst y-inset, using `vertical-align: baseline` on widgets, and applying a per-SVG em offset derived from typst glyph transforms (with ink-bbox fallback for fractions).
