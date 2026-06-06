---
'vscode-prosemark-latex-integration': patch
---

Load MathJax via a top-level static `import 'mathjax/tex-svg.js'` (peer dependency of `@prosemark/latex`) so Vite fully bundles it into the webview instead of deferring a dynamic import at setup time. Disable MathJax a11y speech/enrichment so the combined `tex-svg` component does not try to load the separate `sre/speech-worker.js` file (not copied into the VS Code webview bundle).
