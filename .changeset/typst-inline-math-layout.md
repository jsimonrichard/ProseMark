---
'@prosemark/typst': patch
---

Fix inline math layout by stripping typst.ts SVG selection overlays (`foreignObject` / `.tsel` with `position: fixed`) and omitting CSS/JS from widget renders.
