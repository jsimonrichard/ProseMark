---
'@prosemark/typst': patch
---

Align inline Typst math with surrounding text by removing extra typst y-inset, using `vertical-align: baseline` on widgets, and applying a per-SVG em offset derived from typst glyph transforms (with ink-bbox fallback for fractions). Expand typst viewBoxes to ink bounds so subscripts and fractions do not clip or overlap the next line. Scale display math SVGs to em-based height (typst pt width/height attributes render too small in the browser).
