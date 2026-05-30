---
'@prosemark/typst': patch
---

Fix inline and block math layout by forcing typst.ts SVG output to `display: inline` (multiple SVG fragments otherwise stack as block). Also strip selection overlays and omit CSS/JS from widget renders.
