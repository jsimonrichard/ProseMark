# @prosemark/spellcheck-frontend

## 0.0.2

### Patch Changes

- 3c0e35c: Improve inline code rendering and theming consistency.
  - add and document `--pm-code-font` so code spans and fenced code blocks can use a custom monospace stack
  - keep inline code pill styling stable when spellcheck marks overlap code content
  - keep inline code marks visible during editing, and include backticks inside the code pill while editing
  - set spellcheck decorations to high precedence so spellcheck underlines render correctly within styled inline code

- b732e28: Improve editor state stability across ProseMark core and VS Code extensions.

  Key fixes include:
  - serialized webview-to-document updates to avoid race conditions during rapid edits
  - safer mismatch recovery and improved frontend error reporting in the VS Code extension
  - spellcheck decoration/state synchronization hardening to prevent stale out-of-range ranges
  - fenced-code selection stability improvements while preserving expected marker edit UX

- Updated dependencies [eb433ce]
- Updated dependencies [3c0e35c]
- Updated dependencies [7e1f596]
- Updated dependencies [8be2705]
- Updated dependencies [b732e28]
  - @prosemark/core@0.0.5

## 0.0.1

### Patch Changes

- 4ae4baf: Add basic spellcheck abilities
- 0e7b2b2: Added spellcheck tooltips
