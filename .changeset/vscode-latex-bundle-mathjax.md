---
vscode-prosemark-latex-integration: patch
---

Bundle MathJax `tex-svg.js` into the webview with Vite and use `@prosemark/latex` `mathJaxLoadMode: 'static-import'` instead of copying the package and passing a webview URL.
