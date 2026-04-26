---
"@prosemark/vscode-extension-integrator": patch
---

Add `appendToExtraCodeMirrorExtensions` to merge into the shared `extraCodeMirrorExtensions` compartment via `Compartment.reconfigure` (preserving other integrations). cSpell and LaTeX VS Code webviews use it instead of replacing the compartment or `StateEffect.appendConfig`; both guard `setup` with an idempotent flag.
