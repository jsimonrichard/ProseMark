---
"@prosemark/core": patch
"@prosemark/spellcheck-frontend": patch
"vscode-prosemark": patch
"vscode-prosemark-cspell-integration": patch
---

Improve editor state stability across ProseMark core and VS Code extensions.

Key fixes include:

- serialized webview-to-document updates to avoid race conditions during rapid edits
- safer mismatch recovery and improved frontend error reporting in the VS Code extension
- spellcheck decoration/state synchronization hardening to prevent stale out-of-range ranges
- fenced-code selection stability improvements while preserving expected marker edit UX
