---
'vscode-prosemark-latex-integration': patch
---

Load MathJax via a top-level static `import 'mathjax/tex-svg.js'` (peer dependency of `@prosemark/latex`) so Vite fully bundles it into the webview instead of deferring a dynamic import at setup time.
