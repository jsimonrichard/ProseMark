---
'@prosemark/typst': patch
---

Fix inline and block math layout by setting `display: inline` on typst SVG output (including multiple sibling fragments) via inline styles and widget CSS, so fragments do not stack as block-level boxes. Rewrite typst `#000` fills to `currentColor` so math inherits editor text color.
