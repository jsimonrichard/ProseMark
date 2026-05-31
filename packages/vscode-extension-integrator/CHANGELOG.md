# @prosemark/vscode-extension-integrator

## 0.0.2

### Patch Changes

- 6600ba2: Expose `@prosemark/core` on the ProseMark webview alongside the CodeMirror globals so other extensions (e.g. our latex integration) can use the same facets as our core extension (required for foldable syntax extensions).
- 6600ba2: Add `appendToExtraCodeMirrorExtensions` to merge into the shared `extraCodeMirrorExtensions` compartment via `Compartment.reconfigure` (preserving other integrations). cSpell and LaTeX VS Code webviews use it instead of replacing the compartment or `StateEffect.appendConfig`; both guard `setup` with an idempotent flag.

## 0.0.1

### Patch Changes

- 358c360: Add onSubsequentRegistration callbacks
- 0e7b2b2: Create a sub extension system allowing secondary vscode extensions to provide the main extension with additional functionality
