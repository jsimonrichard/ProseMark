---
'@prosemark/latex': patch
'@prosemark/vscode-extension-integrator': patch
'vscode-prosemark-latex-integration': patch
---

Fix LaTeX math failing to render in the VS Code webview after 0.0.2 bundled MathJax `tex-svg.js` into `webview.js`: MathJax 4's startup loads `sre/speech-worker.js` as a separate web worker, which the bundler did not ship.

- **vscode-prosemark-latex-integration**: self-host MathJax with `url-import` (`tex-svg.js` + `sre/` under `dist/webview/mathjax/`) and pass the package URL from the extension host via `webview.asWebviewUri`.
- **@prosemark/latex**: add `@prosemark/latex/vite-plugin-mathjax` to copy configurable paths from the `mathjax` npm package into a Vite build output.
- **@prosemark/vscode-extension-integrator**: pass sub-extension callback context as a single object (including `webview`).
