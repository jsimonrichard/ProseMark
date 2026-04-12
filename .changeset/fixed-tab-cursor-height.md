---
"@prosemark/core": patch
---

Replace each tab with a fixed-pixel-width span that still contains a real `\t` (for `moveVisually`), and override `WidgetType.coordsAt` so `drawSelection` uses the box edges instead of clipped glyph rects next to `overflow: hidden`.
