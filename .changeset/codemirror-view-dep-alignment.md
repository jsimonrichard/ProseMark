---
'@prosemark/core': patch
'@prosemark/latex': patch
'@prosemark/paste-rich-text': patch
'@prosemark/render-html': patch
'@prosemark/vscode-extension-integrator': patch
---

Align direct `@codemirror/view` dependencies to `^6.42.1` and regenerate the workspace lockfile so Bun installs one `@codemirror/view` copy. This avoids TypeScript errors from duplicate nested `@codemirror/view` versions (for example under `@codemirror/language`) after lockfile merges.

For `@prosemark/latex`, replace `bun-types` with `@types/bun` in devDependencies to match other packages.
