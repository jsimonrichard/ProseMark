---
"vscode-prosemark": patch
"vscode-prosemark-latex-integration": patch
---

Add **vscode-prosemark-latex-integration** to the ProseMark **extension pack**.

**Versioning:** the new extension’s `package.json` starts at **`0.0.0`** on purpose. The first **changeset version** / publish pass bumps it to **`0.0.1`**, so the Marketplace and changelog never show a confusing “0.0.0” release—only real semver from the first public version onward.

**Behavior:** LaTeX webview defers loading `@prosemark/latex` until the editor exists and merges into `extraCodeMirrorExtensions` with other integrations.
