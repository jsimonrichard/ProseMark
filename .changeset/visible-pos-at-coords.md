---
'@prosemark/core': patch
---

Map pointer caret position over font-size-0 hide marks with a discrete positive-width `coordsForChar` hit-test so CodeMirror `posAtCoords` does not land on collapsed tokens.
