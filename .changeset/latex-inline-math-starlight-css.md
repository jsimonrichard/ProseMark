---
'@prosemark/latex': patch
---

Fix inline MathJax SVG layout when doc themes (e.g. Starlight) set `.sl-markdown-content svg { display: block; height: auto }` by overriding display and height on inline math widgets.
