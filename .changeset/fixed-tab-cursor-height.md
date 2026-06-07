---
"@prosemark/core": patch
---

Replace each tab with a fixed-pixel-width span that still contains a real `\t` (for `moveVisually`), and override `WidgetType.coordsAt` using the widget text offset (`pos` 0 vs 1) for left/right edges — not the document `side` argument, which misaligned `drawSelection` with the caret next to tabs.
