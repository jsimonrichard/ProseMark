---
'@prosemark/latex': patch
'vscode-prosemark-latex-integration': patch
---

Fix empty math widgets in stock VS Code by disabling MathJax SRE there (webview workers cannot `importScripts` extension resources). Keep SRE on in Cursor. Add `enableMathJaxA11y` / `preconfigureMathJaxLoader({ enableA11y })` for other hosts.
