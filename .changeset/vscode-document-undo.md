---
'vscode-prosemark': patch
'@prosemark/core': patch
'@prosemark/vscode-extension-integrator': patch
---

Own document undo/redo on the VS Code TextDocument stack: the ProseMark webview forwards Mod-z/y instead of keeping a competing CodeMirror history.
