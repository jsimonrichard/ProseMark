---
'@prosemark/typst': patch
---

Fix typst math ink color show rule that broke compilation, and match LaTeX-style error display (red monospace source plus readable tooltip messages). Guard async widget updates so errors are not dropped when widgets are recreated during theme/ink sync.
