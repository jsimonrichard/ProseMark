---
'vscode-prosemark': patch
'@prosemark/core': patch
'@prosemark/vscode-extension-integrator': patch
---

Fix custom-editor undo: the VS Code TextDocument owns undo/redo (the webview forwards Mod-z/y and skips CodeMirror document history), keep the caret on the edit through document sync at the end of the mapped range, and drop late applyEdit echoes so typed text cannot race back into the webview.
