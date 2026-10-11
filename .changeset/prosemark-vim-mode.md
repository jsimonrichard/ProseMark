---
'vscode-prosemark-vim-integration': patch
---

Add an optional ProseMark companion extension for vim-style editing (`@replit/codemirror-vim`), controlled by `prosemark.vimModeEnabled` (default true). When enabled, also installs CodeMirror `drawSelection` so selection stays visible (vim hides native `::selection`). Not part of the ProseMark extension pack — install separately when wanted.
