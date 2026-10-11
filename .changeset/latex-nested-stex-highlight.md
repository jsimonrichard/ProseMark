---
'@prosemark/latex': patch
'vscode-prosemark': patch
---

Add nested TeX highlighting inside `$...$` / `$$...$$` via `latexMathNestedHighlightExtension` (`stexMath` + `parseMixed`), export `latexLanguageDescription` for fenced LaTeX blocks, and style delimiters / braces / commands in `latexMarkdownSyntaxTheme`. Wire the nested parser into the VS Code webview.
