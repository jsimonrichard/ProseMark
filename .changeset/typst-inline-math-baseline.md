---
'@prosemark/typst': patch
---

Align inline Typst math with surrounding text by removing extra typst y-inset, using `vertical-align: baseline` on widgets, and applying a per-SVG em offset derived from typst glyph transforms (with ink-bbox fallback for fractions). Expand typst viewBoxes to ink bounds so subscripts and fractions do not clip or overlap the next line. Scale typst SVG height from viewBox pt using a 12pt-per-em ratio (typst body size). Scale display math the same way.
