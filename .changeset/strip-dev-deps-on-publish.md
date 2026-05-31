---
'@prosemark/core': patch
'@prosemark/latex': patch
'@prosemark/paste-rich-text': patch
'@prosemark/render-html': patch
'@prosemark/spellcheck-frontend': patch
'@prosemark/vscode-extension-integrator': patch
---

Published packages no longer include `devDependencies` in their npm registry manifest; CI strips `devDependencies` before `bun pm pack` so workspace-only dev tooling is not resolved at publish time.
