---
'@prosemark/core': patch
---

Fix click-and-drag text selection when `hideExtension` is active: the hide `mouseSelectionStyle` now expands the range like CodeMirror's default instead of only moving the cursor.
