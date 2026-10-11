# vscode-prosemark-vim-integration

## 0.0.1

### Patch Changes

- 6a9e9d9: Add an optional ProseMark companion extension for vim-style editing (`@replit/codemirror-vim`), controlled by `prosemark.vimModeEnabled` (default true). When enabled, also installs CodeMirror `drawSelection` so selection stays visible (vim hides native `::selection`), and matches the thin insert-mode caret to the editor caret color. Not part of the ProseMark extension pack — install separately when wanted.
- Updated dependencies [efa9cf3]
  - @prosemark/vscode-extension-integrator@0.0.6
