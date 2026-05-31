---
'@prosemark/typst': patch
---

Inject the editor foreground color into typst math documents (`#show math.equation: set text(fill: …)`) so fraction bars and other stroked elements match light/dark themes, instead of rewriting SVG fills only.
