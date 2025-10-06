# vscode-prosemark

## 0.0.2

### Patch Changes

- 44bbeda: - Add a VS Code Extension using ProseMark to edit markdown files
  - Make the link click handler in @prosemark/core configurable
- b0cfd71: Grab focus whenever the editor is opened or displayed
- df882b5: Add padding so that the bottom line of the editor content can be centered in the viewport
- 4c17656: Add word and character counts indicator to status bar when editing markdown files
- c430abd: Fixed bug causing autoformating (and other VS Code initiated document changes) to mis-edit the text displayed in the webview.
- 58ccd5c: Can paste rich text into editor
- 2991377: Changed the minimum VS Code version requirement to something more reasonable (1.90.0)
