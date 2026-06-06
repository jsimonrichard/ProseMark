---
vscode-prosemark-latex-integration: patch
---

Fix LaTeX math failing to render in the VS Code webview caused by bundling MathJax into the extension in 0.0.2. Load MathJax from a self-hosted `mathjax/` folder with `url-import` and pass the package URL from the extension host via `webview.asWebviewUri`.
