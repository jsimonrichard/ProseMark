---
'@prosemark/latex': minor
'@prosemark/vscode-extension-integrator': minor
'vscode-prosemark-latex-integration': patch
---

Add `@prosemark/latex/vite-plugin-mathjax` to copy configurable paths from the `mathjax` npm package into a Vite build output, pass sub-extension callback context as a single object (including `webview`), and switch the LaTeX VS Code webview to self-hosted `url-import` with the MathJax package URL from `webview.asWebviewUri` (`tex-svg.js` + `sre` under `dist/webview/mathjax/`).
