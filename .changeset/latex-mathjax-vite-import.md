---
"@prosemark/latex": patch
---

Load MathJax startup bundles via absolute URL (`mathJaxPackageUrl`) instead of bare `import('mathjax/...')` so Vite and other browser bundlers work with the pre-built package. Drop the `mathjax` npm dependency; only the chosen output bundle (`tex-svg.js` or `tex-chtml.js`) is fetched at runtime.
