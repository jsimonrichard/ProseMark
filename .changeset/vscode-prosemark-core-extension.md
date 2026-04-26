---
"vscode-prosemark": patch
---

**ProseMark (VS Code core)** — webview dispatches **`prosemark:view-ready`** on `window` after the CodeMirror `EditorView` is created so companion extensions can defer `setup` until `window.proseMark.view` exists. Extension pack lists optional integrations (e.g. LaTeX) instead of bundling **`@prosemark/latex`** inside the core editor webview.
