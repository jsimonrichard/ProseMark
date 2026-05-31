---
'@prosemark/core': patch
---

Fix 1–2px soft-indent misalignment on top-level list items when text wraps.

Measure prefix width from the line text-indent origin (line box + 6px) instead of
widget or prefix-character coordinates, so hanging-indent math matches layout.
