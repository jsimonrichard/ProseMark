---
"@prosemark/latex": patch
---

Improve MathJax integration for bundled apps and pre-built `@prosemark/latex`:

- **Default (`url-import`)**: load the startup component via an absolute URL from `mathJaxPackageUrl` (default jsDelivr) instead of a bare `import('mathjax/...')`, so Vite and browsers work with the published package; remove the direct `mathjax` dependency and add an optional peer.
- **`static-import`**: add `mathJaxLoadMode` so apps can bundle MathJax with their own bundler; export `preconfigureMathJaxLoader` and `awaitMathJaxAfterStaticImport`; `mathJaxPackageUrl` applies only to `url-import`.
- Document load modes and add Bun tests for static-import helpers.
