# vscode-prosemark-cspell-integration

## 0.0.4

### Patch Changes

- 2f5166d: Spell-check integration now layers on top of other editor add-ons instead of replacing them, so ProseMark can keep spell checking alongside math and other features.
- Updated dependencies [6600ba2]
- Updated dependencies [6600ba2]
  - @prosemark/vscode-extension-integrator@0.0.2
  - @prosemark/spellcheck-frontend@0.0.4

## 0.0.3

### Patch Changes

- 6d9c326: Updated build system to use vite instead of tsdown for the webviews
- Updated dependencies [ce2ce1a]
  - @prosemark/spellcheck-frontend@0.0.3

## 0.0.2

### Patch Changes

- b732e28: Improve editor state stability across ProseMark core and VS Code extensions.

  Key fixes include:
  - serialized webview-to-document updates to avoid race conditions during rapid edits
  - safer mismatch recovery and improved frontend error reporting in the VS Code extension
  - spellcheck decoration/state synchronization hardening to prevent stale out-of-range ranges
  - fenced-code selection stability improvements while preserving expected marker edit UX

- cb9d1f7: Enable continuous delivery for ProseMark VS Code extensions via the changeset release workflow.

  This wires extension publishing into release automation and adds a local dry-run mode for pre-merge verification.

- Updated dependencies [3c0e35c]
- Updated dependencies [b732e28]
  - @prosemark/spellcheck-frontend@0.0.2

## 0.0.1

### Patch Changes

- 358c360: Reload editors when a new sub-extension is registered
- 0e7b2b2: Create a sub extension system allowing secondary vscode extensions to provide the main extension with additional functionality
- Updated dependencies [358c360]
- Updated dependencies [4ae4baf]
- Updated dependencies [0e7b2b2]
- Updated dependencies [0e7b2b2]
  - @prosemark/vscode-extension-integrator@0.0.1
  - @prosemark/spellcheck-frontend@0.0.1
