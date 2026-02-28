# vscode-prosemark

## 0.0.6

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

- cb9d1f7: Enable continuous delivery for ProseMark VS Code extensions via the changeset release workflow.

  This wires extension publishing into release automation and adds a local dry-run mode for pre-merge verification.

- Updated dependencies [eb433ce]
- Updated dependencies [3c0e35c]
- Updated dependencies [7e1f596]
- Updated dependencies [8be2705]
- Updated dependencies [aa619dd]
- Updated dependencies [b732e28]
  - @prosemark/core@0.0.5
  - @prosemark/paste-rich-text@0.0.3
  - @prosemark/render-html@0.0.6

## 0.0.5

### Patch Changes

- 358c360: Reload editors when a new sub-extension is registered
- 4ae4baf: Add basic spellcheck abilities
- 0e7b2b2: Create a sub extension system allowing secondary vscode extensions to provide the main extension with additional functionality
- Updated dependencies [358c360]
- Updated dependencies [0e7b2b2]
  - @prosemark/vscode-extension-integrator@0.0.1

## 0.0.4

### Patch Changes

- 07b95ec: Fix horizontal rule styling
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
  - @prosemark/core@0.0.4
  - @prosemark/render-html@0.0.4

## 0.0.3

### Patch Changes

- c1729f8: Fix a bug causing a single text document update to apply to all open editors
- cae962e: Fix a bug in diff mode that repeatedly grabbed focus

## 0.0.2

### Patch Changes

- b3a35fb: - Add a VS Code Extension using ProseMark to edit markdown files
  - Make the link click handler in @prosemark/core configurable
- b3a35fb: Grab focus whenever the editor is opened or displayed
- b3a35fb: Add padding so that the bottom line of the editor content can be centered in the viewport
- b3a35fb: Add word and character counts indicator to status bar when editing markdown files
- b3a35fb: Fixed bug causing autoformating (and other VS Code initiated document changes) to mis-edit the text displayed in the webview.
- b3a35fb: Can paste rich text into editor
- b3a35fb: Changed the minimum VS Code version requirement to something more reasonable (1.90.0)
