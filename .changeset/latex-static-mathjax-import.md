---
'vscode-prosemark-latex-integration': patch
---

Load MathJax via a top-level static `import 'mathjax/tex-svg.js'` (peer dependency of `@prosemark/latex`) so Vite fully bundles it into the webview instead of deferring a dynamic import at setup time. Copy `mathjax/sre/` into `dist/webview/sre/` at build time so the combined `tex-svg` component can load its speech web worker at runtime.
