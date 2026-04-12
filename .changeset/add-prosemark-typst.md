---
'@prosemark/typst': minor
---

Add **`@prosemark/typst`**: CodeMirror widgets that render dollar-delimited **`Math`** nodes with [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) (WASM compiler/renderer), plus delimiter/formula syntax theme and an LRU SVG cache. Copy both **`.wasm`** binaries into **`dist/wasm/`** at build and default to **`import.meta.url`** (no CDN). Re-export math markdown syntax as **`typstMath*`** for consumers who only install this package.
