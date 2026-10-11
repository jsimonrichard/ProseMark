---
'@prosemark/core': patch
---

Add `visiblePosAtCoords` so pointer selection maps past font-size-0 hide marks (discrete `coordsForChar` hit-test), wire it through `hideExtension`, document it for hide hosts, and keep autolink-style link labels visible when the label is itself a `URL` node.
