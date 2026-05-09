---
"@prosemark/latex": patch
---

Add `mathJaxLoadMode: 'url-import' | 'static-import'` so apps can load MathJax via their bundler instead of runtime URL `import()`. Export `preconfigureMathJaxLoader` and `awaitMathJaxAfterStaticImport`; make `mathJaxPackageUrl` meaningful only for `url-import`. Add Bun tests for static-import helpers.
