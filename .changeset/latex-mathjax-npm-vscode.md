---
"@prosemark/vscode-extension-integrator": patch
"@prosemark/latex": patch
vscode-prosemark: patch
vscode-prosemark-cspell-integration: patch
vscode-prosemark-latex-integration: patch
---

Pass the webview into `SubExtension.onReady` so integrations can build `asWebviewUri` asset bases. Document optional `mathjax` peer and npm self-hosting for `@prosemark/latex`. Ship MathJax inside the LaTeX VS Code extension via a post-build copy and wire `mathJaxPackageUrl` from the host.
