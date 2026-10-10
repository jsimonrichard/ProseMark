---
'@prosemark/render-html': patch
---

Route clicks on sanitized `<a href>` tags inside HTML block widgets through the shared `clickLinkHandler` facet, while still letting non-link clicks place the editor cursor.
