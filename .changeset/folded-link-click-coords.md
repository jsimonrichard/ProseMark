---
'@prosemark/core': patch
---

Correct pointer caret placement when font-size-0 hidden markdown tokens confuse `posAtCoords`, and keep autolink-style link labels visible when the label is itself a `URL` node.
