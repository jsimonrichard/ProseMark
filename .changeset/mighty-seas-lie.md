---
'@prosemark/core': patch
'@prosemark/render-html': patch
---

Move HTML-specific markdown parsing for multi-line-break HTML blocks from `@prosemark/core` into `@prosemark/render-html`.

`@prosemark/render-html` now exports `renderHtmlMarkdownSyntaxExtensions` for use alongside core markdown extensions, and integrations were updated to include both extension arrays.
