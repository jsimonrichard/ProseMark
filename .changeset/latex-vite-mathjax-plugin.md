---
'@prosemark/latex': minor
'vscode-prosemark-latex-integration': patch
---

Add `@prosemark/latex/vite-plugin-mathjax` to copy configurable paths from the `mathjax` npm package into a Vite build output, export `mathJaxPackageUrlFromWebviewScript` (with `scriptSrcIncludes` for multi-script VS Code webviews), and switch the LaTeX VS Code webview to self-hosted `url-import` (`tex-svg.js` + `sre` under `dist/webview/mathjax/`).
