---
'@prosemark/typst': patch
---

Default Typst WASM URLs to jsDelivr (pinned version) instead of bundler `?url` imports, so static hosts (e.g. Cloudflare Pages) are not required to ship the ~28 MB compiler WASM. Export `jsdelivrTypstWasmUrls` and `TYPST_TS_VERSION`; override with `compilerWasmUrl` / `rendererWasmUrl` to self-host or bundle.
