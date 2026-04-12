---
'@prosemark/typst': minor
---

Add **`@prosemark/typst`**: CodeMirror widgets that render dollar-delimited **`Math`** nodes with [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) (WASM compiler/renderer), plus delimiter/formula syntax theme and an LRU SVG cache. Default WASM URLs come from **imports** of **`@myriaddreamin/typst-ts-*`** (app bundlers emit asset URLs). Re-export math markdown syntax as **`typstMath*`** for consumers who only install this package.
