---
'@prosemark/vscode-extension-integrator': patch
---

Expose `@prosemark/core` on the ProseMark webview alongside the CodeMirror globals so other extensions (e.g. our latex integration) can use the same facets as our core extension (required for foldable syntax extensions).
