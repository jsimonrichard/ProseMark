---
'@prosemark/typst': patch
---

Inject the editor foreground color into typst math documents (`#show math` / `#show math.equation: set text(fill: …)`), resolve color at widget render time (not the default black field value), and fall back to rewriting black SVG fill/stroke to `currentColor`.
