---
vscode-prosemark-latex-integration: patch
---

Fix LaTeX math failing to render in the VS Code webview when MathJax was loaded from a CDN without explicitly listing it in the extension's `package.json` settings. Self-host MathJax with `url-import` (`tex-svg.js` and `sre/` under `dist/webview/mathjax/`) and pass the package URL from the extension host via `webview.asWebviewUri`.
