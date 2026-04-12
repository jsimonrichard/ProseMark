---
"@prosemark/core": patch
---

Align the fixed-width tab widget to the text box so the caret height stays consistent when the cursor is placed right after a tab character, and add a high-precedence arrow-key step so horizontal motion can cross replaced tab columns that `moveVisually` skips.
