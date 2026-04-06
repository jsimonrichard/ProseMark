# `@prosemark/spellcheck-frontend`

CodeMirror 6 extensions for **showing** spellcheck issues in a ProseMark (or other markdown) editor. This package does not ship a dictionary or spell engine; you supply misspelled ranges and optional suggestion data.

Published on npm: [`@prosemark/spellcheck-frontend`](https://www.npmjs.com/package/@prosemark/spellcheck-frontend).

## What it provides

- **`spellcheckIssues`** — Facet backed by a `RangeSet<SpellcheckIssue>`. Your code (for example a `StateField`) computes issues and provides them via `spellcheckIssues.from(field)`.
- **`SpellcheckIssue`** — Range value holding the misspelled word text and optional `suggestions` (`{ word, isPreferred? }[]`).
- **`spellcheckExtension`** — Bundle to add: wavy underlines for issues, theme hooks, and the tooltip UI (high-precedence decorations so underlines work inside styled inline code).
- **`suggestionFetcher`** — Optional facet: `(word) => Promise<Suggestion[]>` for loading suggestions when they are not already on the issue.
- **`spellcheckActions`** — Optional facet: register tooltip actions (for example “add to dictionary”) with `execute(word, view)`.

## Theming (CSS variables)

Underline:

- `--pm-spellcheck-issue-underline-color`
- `--pm-spellcheck-issue-background-color`

Tooltip (see [Spellcheck styling](https://prosemark.com/reference/spellcheck-styling/) for demo values and a full list):

- `--pm-spellcheck-tooltip-background`, `--pm-spellcheck-tooltip-border`, `--pm-spellcheck-tooltip-text`, `--pm-spellcheck-tooltip-error`, `--pm-spellcheck-tooltip-hover`, `--pm-spellcheck-tooltip-actions-border`, `--pm-spellcheck-tooltip-font-size`

## Dependencies

- `@codemirror/state`, `@codemirror/view`
- `@prosemark/core`

## Example integration

The [demo app](https://github.com/jsimonrichard/ProseMark/tree/main/apps/demo) uses [`nspell`](https://github.com/wooorm/nspell) plus `dictionary-en` to compute issues and suggestions, then wires `spellcheckExtension`, `suggestionFetcher`, and `spellcheckActions` the same way as in the docs site demo.

In VS Code, the [**ProseMark - Code Spell Checker (cSpell) Integration**](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-cspell-integration) extension connects the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension to this UI layer.
