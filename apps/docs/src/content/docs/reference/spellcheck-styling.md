---
title: Spellcheck styling
description: CSS variables for @prosemark/spellcheck-frontend underlines and tooltips.
---

[`@prosemark/spellcheck-frontend`](/reference/features/#prosemarkspellcheck-frontend) reads the following variables. Defaults exist for several of them; set overrides on a container that wraps the editor (or on `:root`) to match your theme.

## Underlines

| Variable | Purpose |
| -------- | ------- |
| `--pm-spellcheck-issue-underline-color` | Wavy underline color for misspelled ranges |
| `--pm-spellcheck-issue-background-color` | Background behind marked text (often left unset) |

## Tooltip

| Variable | Purpose |
| -------- | ------- |
| `--pm-spellcheck-tooltip-background` | Tooltip panel background |
| `--pm-spellcheck-tooltip-border` | Tooltip border |
| `--pm-spellcheck-tooltip-text` | Primary text and headings |
| `--pm-spellcheck-tooltip-error` | Error state text |
| `--pm-spellcheck-tooltip-hover` | Row hover background for suggestions and actions |
| `--pm-spellcheck-tooltip-actions-border` | Separator between actions and suggestions |
| `--pm-spellcheck-tooltip-font-size` | Tooltip font size |

## Example (light and dark)

The [demo](/demo) and [getting started](/guides/getting-started/) editor use values like the following:

```css
:root {
  --pm-spellcheck-tooltip-background: oklch(100% 0 0);
  --pm-spellcheck-tooltip-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-text: oklch(30% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(55% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(96% 0.005 264);
  --pm-spellcheck-tooltip-actions-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-font-size: 0.9rem;
}

:root[data-theme='dark'] {
  --pm-spellcheck-tooltip-background: oklch(25% 0.02 264);
  --pm-spellcheck-tooltip-border: oklch(40% 0.02 264);
  --pm-spellcheck-tooltip-text: oklch(75% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(65% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(35% 0.02 264);
  --pm-spellcheck-tooltip-actions-border: oklch(40% 0.02 264);
}
```

VS Code sets `--pm-spellcheck-issue-underline-color` from the editor theme in the ProseMark webview; see the extension stylesheet in the repo if you need to align with that behavior.
