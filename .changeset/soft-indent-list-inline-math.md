---
'@prosemark/core': patch
'@prosemark/latex': patch
---

Fix broken layout when inline `$...$` math appears on soft-indented lines (lists, blockquotes, leading spaces, tasks).

**Compared to the previous release (`main`):** the soft-indent prefix regex is unchanged (`softIndentPattern`). This release tightens *which* lines receive soft indent and *how* prefix width is measured:

- **`matchSoftIndentPrefix`** — only applies soft indent when the line has a real markdown prefix (blockquote `>`, leading space/tab, list marker, or task checkbox). Plain paragraphs with math no longer match the regex’s empty optional groups.
- **Stable prefix measurement** — measure through the last prefix character and use `coordsAtPos` deltas so padding does not grow on every click or edit; list-mark replace widgets are handled correctly.
- **`cm-soft-indent-line`** — class on soft-indented lines for theme hooks.

**`@prosemark/latex`:** on soft-indented lines, inline MathJax widgets use `display: inline` / `baseline` alignment so hanging `text-indent` matches other list items instead of pushing math farther right or overlapping bullets.

Also exports **`isInlineMathNode`** (inline vs display `$...$` detection for tooling; does not change math parsing).
