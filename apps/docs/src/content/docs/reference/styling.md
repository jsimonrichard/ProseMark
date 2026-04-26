---
title: Styling
description: CSS variables for ProseMark packages (@prosemark/core and @prosemark/spellcheck-frontend).
---

ProseMark themes use **`--pm-*` CSS variables**. Set them on `:root`, on a `[data-theme]` variant, or on a wrapper around the editor. Values below match the [demo](/demo); adjust for your app.

## `@prosemark/core`

Used by `prosemarkBaseThemeSetup()` / `prosemarkLightThemeSetup()` and related themes for prose, editor controls, and syntax highlighting inside the editor.

### Prose and editor controls

| Variable | Purpose |
| -------- | ------- |
| `--pm-header-mark-color` | ATX (`#`) and Setext (`=====` / `-----`) heading markers |
| `--pm-link-color` | Links |
| `--pm-muted-color` | Muted / secondary text |
| `--pm-code-background-color` | Inline code and code-fence background |
| `--pm-code-font` | Monospace stack for inline code and fenced blocks |
| `--pm-code-btn-background-color` | Code-fence toolbar button background |
| `--pm-code-btn-hover-background-color` | Code-fence toolbar button hover |
| `--pm-blockquote-vertical-line-background-color` | Block quote bar |
| `--pm-cursor-color` | Caret |

### Syntax highlighting (code fences)

These follow CodeMirror tag names mapped in the ProseMark theme:

| Variable | Typical use |
| -------- | ----------- |
| `--pm-syntax-link` | Links in code |
| `--pm-syntax-keyword` | Keywords |
| `--pm-syntax-atom` | Atoms |
| `--pm-syntax-literal` | Literals |
| `--pm-syntax-string` | Strings |
| `--pm-syntax-regexp` | Regex |
| `--pm-syntax-definition-variable` | Definitions |
| `--pm-syntax-local-variable` | Locals |
| `--pm-syntax-type-namespace` | Types / namespaces |
| `--pm-syntax-class-name` | Class names |
| `--pm-syntax-special-variable-macro` | Specials / macros |
| `--pm-syntax-definition-property` | Properties |
| `--pm-syntax-comment` | Comments |
| `--pm-syntax-invalid` | Invalid / error |

`@prosemark/render-html` and `@prosemark/paste-rich-text` do not define their own `--pm-*` variables; they inherit the same editor surface and code styling from core.

## `@prosemark/spellcheck-frontend`

### Underlines

| Variable | Purpose |
| -------- | ------- |
| `--pm-spellcheck-issue-underline-color` | Wavy underline on misspelled ranges |
| `--pm-spellcheck-issue-background-color` | Background on marked text (often left unset) |

### Tooltip

| Variable | Purpose |
| -------- | ------- |
| `--pm-spellcheck-tooltip-background` | Tooltip panel background |
| `--pm-spellcheck-tooltip-border` | Tooltip border |
| `--pm-spellcheck-tooltip-text` | Primary text and headings |
| `--pm-spellcheck-tooltip-error` | Error state text |
| `--pm-spellcheck-tooltip-hover` | Row hover for suggestions and actions |
| `--pm-spellcheck-tooltip-actions-border` | Separator between actions and suggestions |
| `--pm-spellcheck-tooltip-font-size` | Tooltip font size |

In VS Code, `--pm-spellcheck-issue-underline-color` is set from the editor theme in the ProseMark webview; see the extension stylesheet in the repo to align with that behavior.

## Demo: light and dark

Example base typography plus all variables used on [prosemark.com](/):

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  --pm-header-mark-color: oklch(82.8% 0.111 230.318);
  --pm-link-color: oklch(58.8% 0.158 241.966);
  --pm-muted-color: oklch(37.2% 0.044 257.287);
  --pm-code-background-color: oklch(92.9% 0.013 255.508);
  --pm-code-font:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  --pm-code-btn-background-color: oklch(86.9% 0.022 252.894);
  --pm-code-btn-hover-background-color: oklch(70.4% 0.04 256.788);
  --pm-blockquote-vertical-line-background-color: oklch(70.4% 0.04 256.788);

  --pm-syntax-link: oklch(62.75% 0.188 259.38);
  --pm-syntax-keyword: oklch(58.13% 0.248 297.57);
  --pm-syntax-atom: oklch(51.29% 0.219 260.63);
  --pm-syntax-literal: oklch(57.38% 0.111 170.31);
  --pm-syntax-string: oklch(54.86% 0.184 25.53);
  --pm-syntax-regexp: oklch(65.88% 0.184 43.8);
  --pm-syntax-definition-variable: oklch(45.32% 0.171 260.3);
  --pm-syntax-local-variable: oklch(64.13% 0.09 184.42);
  --pm-syntax-type-namespace: oklch(49.1% 0.091 165.52);
  --pm-syntax-class-name: oklch(64.42% 0.11 168.83);
  --pm-syntax-special-variable-macro: oklch(52.58% 0.212 282.71);
  --pm-syntax-definition-property: oklch(42.1% 0.142 260.08);
  --pm-syntax-comment: oklch(62.79% 0.022 252.89);
  --pm-syntax-invalid: oklch(64.62% 0.203 29.2);
  --pm-cursor-color: black;

  --pm-spellcheck-tooltip-background: oklch(100% 0 0);
  --pm-spellcheck-tooltip-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-text: oklch(30% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(55% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(96% 0.005 264);
  --pm-spellcheck-tooltip-actions-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-font-size: 0.9rem;
}

:root[data-theme='dark'] {
  --pm-header-mark-color: oklch(44.3% 0.11 240.79);
  --pm-link-color: oklch(58.8% 0.158 241.966);
  --pm-muted-color: oklch(55.4% 0.046 257.417);
  --pm-code-background-color: oklch(27.9% 0.041 260.031);
  --pm-code-font:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  --pm-code-btn-background-color: oklch(37.2% 0.044 257.287);
  --pm-code-btn-hover-background-color: oklch(44.6% 0.043 257.281);
  --pm-blockquote-vertical-line-background-color: oklch(44.6% 0.043 257.281);

  --pm-syntax-link: oklch(73.24% 0.17 258.63);
  --pm-syntax-keyword: oklch(70.05% 0.217 296.83);
  --pm-syntax-atom: oklch(65.69% 0.2 259.93);
  --pm-syntax-literal: oklch(71.27% 0.101 169.93);
  --pm-syntax-string: oklch(68.53% 0.164 25.1);
  --pm-syntax-regexp: oklch(76.88% 0.16 43.42);
  --pm-syntax-definition-variable: oklch(61.42% 0.158 259.6);
  --pm-syntax-local-variable: oklch(75.88% 0.082 184.11);
  --pm-syntax-type-namespace: oklch(64.51% 0.083 165.19);
  --pm-syntax-class-name: oklch(76.14% 0.1 168.52);
  --pm-syntax-special-variable-macro: oklch(66.67% 0.193 282.06);
  --pm-syntax-definition-property: oklch(58.92% 0.132 259.4);
  --pm-syntax-comment: oklch(74.9% 0.02 252.89);
  --pm-syntax-invalid: oklch(75.93% 0.182 28.91);
  --pm-cursor-color: white;

  --pm-spellcheck-tooltip-background: oklch(25% 0.02 264);
  --pm-spellcheck-tooltip-border: oklch(40% 0.02 264);
  --pm-spellcheck-tooltip-text: oklch(75% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(65% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(35% 0.02 264);
  --pm-spellcheck-tooltip-actions-border: oklch(40% 0.02 264);
}

#codemirror-container {
  min-height: 100px;
  width: 100%;
  --font: Inter;
}
```

Use `--pm-code-font` for the monospace face of inline code and fenced blocks.
