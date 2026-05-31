---
"@prosemark/core": patch
---

Fix 1–2px soft-indent misalignment on top-level list items when text wraps.

Measure prefix width from the line text-indent origin when the list mark sits at column 0, so the bullet widget's inline offset is included in hanging-indent math.
