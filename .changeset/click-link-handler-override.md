---
'@prosemark/core': patch
'@prosemark/render-html': patch
---

Make `clickLinkHandler` last-wins so a host handler (e.g. VS Code `linkClick`) replaces `defaultClickLinkHandler` instead of stacking with `window.open`.
