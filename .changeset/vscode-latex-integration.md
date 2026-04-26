---
'vscode-prosemark': patch
'vscode-prosemark-latex-integration': minor
---

Add **vscode-prosemark-latex-integration**: a ProseMark sub-extension that loads `@prosemark/latex` in the webview (`latexMarkdownSyntaxTheme` + `latexMarkdownEditorExtensions`) so `$...$` / `$$...$$` math renders with MathJax.

Include it in the **vscode-prosemark** `extensionPack` so installs get math rendering by default.
