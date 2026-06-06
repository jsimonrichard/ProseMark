# @prosemark/vscode-extension-integrator

## 0.0.5

### Patch Changes

- da39c71: Pass sub-extension callback context as a single object including `webview`, so companion extensions can resolve webview resource URLs.

## 0.0.4

### Patch Changes

- 6b5b440: Add package README files with install instructions, usage examples, and links to prosemark.com documentation.

## 0.0.3

### Patch Changes

- 24ca7ca: Update `@codemirror/view` to `^6.42.1`.
- 4c06b33: Published packages no longer include `devDependencies` in their npm registry manifest; CI strips `devDependencies` before `bun pm pack` so workspace-only dev tooling is not resolved at publish time.

## 0.0.2

### Patch Changes

- 6600ba2: Expose `@prosemark/core` on the ProseMark webview alongside the CodeMirror globals so other extensions (e.g. our latex integration) can use the same facets as our core extension (required for foldable syntax extensions).
- 6600ba2: Add `appendToExtraCodeMirrorExtensions` to merge into the shared `extraCodeMirrorExtensions` compartment via `Compartment.reconfigure` (preserving other integrations). cSpell and LaTeX VS Code webviews use it instead of replacing the compartment or `StateEffect.appendConfig`; both guard `setup` with an idempotent flag.

## 0.0.1

### Patch Changes

- 358c360: Add onSubsequentRegistration callbacks
- 0e7b2b2: Create a sub extension system allowing secondary vscode extensions to provide the main extension with additional functionality
