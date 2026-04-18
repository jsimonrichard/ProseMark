---
"@prosemark/vscode-extension-integrator": patch
"vscode-prosemark": patch
"vscode-prosemark-cspell-integration": patch
---

Fire `prosemark:view-ready` on `window` after the CodeMirror view is created so integration scripts can defer work until `window.proseMark.view` exists (fixes race where `onReady` ran `setup` before `core:init`). Restore `appendToExtraCodeMirrorExtensions` and `runWhenProseMarkViewReady`; cSpell webview uses them so spellcheck merges with other extensions and installs after the editor is ready.
