---
title: LaTeX math (MathJax)
description: Set up @prosemark/latex to parse and render $...$ and $$...$$ math in your editor.
---

[`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) adds **rendered math** to a ProseMark Markdown editor: `$...$` and `$$...$$` delimiters are parsed as `Math` syntax nodes and displayed with [MathJax](https://www.mathjax.org/). The [demo](/demo) includes math; try editing formulas there to see inline and block behavior.

This guide walks through installing the package, enabling the **parser**, wiring **editor extensions**, and choosing how **MathJax** is loaded. API details are in the [`@prosemark/latex` TypeDoc](/api/prosemark/latex/).

:::note[Parser vs renderer]
Core defines shared Lezer nodes (`Math`, `MathMark`, `MathFormula`) and [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/) (TeX-style `$...$` / `$$...$$` today), so the same tree can feed different renderers. **`@prosemark/latex`** adds MathJax widgets and theme helpers, and also exports **`latexMath*`** names for the parser—**for now, the same extension as core**. Prefer `latexMathMarkdownSyntaxExtension` when you want the markdown entry point next to `latexMarkdownEditorExtensions()`; that keeps LaTeX setup in one package if delimiter rules ever diverge from another math backend (for example a future Typst integration).
:::

## Install

```bash
npm install @prosemark/latex
```

You also need `@prosemark/core` and the usual CodeMirror markdown stack (see [Getting Started](/guides/getting-started/)).

MathJax is **not** bundled into `@prosemark/latex`. By default the package loads MathJax at **runtime** from jsDelivr (pinned to the version this package is tested against). Optionally add the **`mathjax`** npm package if you want to self-host or bundle it (`static-import` mode).

## Enable math in the Markdown parser

**`latexMarkdownEditorExtensions()` only runs on `Math` syntax nodes.** If the Markdown layer never parses `$...$` / `$$...$$` as math, widgets never attach and formulas stay plain text.

Do **one** of the following:

- Pass [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/) inside `markdown({ extensions: [...] })` (it already includes [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/)), **or**
- Add [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/) from `@prosemark/core`, **or** `latexMathMarkdownSyntaxExtension` from `@prosemark/latex` (today, the same extension), to your markdown extensions.

## Wire up the editor

Add the latex **syntax theme** and **editor extensions** alongside your existing ProseMark setup:

```javascript
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { languages } from '@codemirror/language-data';

import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import {
  latexMarkdownSyntaxTheme,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

const editor = new EditorView({
  parent: document.getElementById('codemirror-container'),
  extensions: [
    markdown({
      codeLanguages: languages,
      extensions: [
        GFM,
        prosemarkMarkdownSyntaxExtensions, // includes math → Math nodes
      ],
    }),
    prosemarkBasicSetup(),
    prosemarkBaseThemeSetup(),
    ...latexMarkdownSyntaxTheme,
    ...latexMarkdownEditorExtensions(),
  ],
});
```

If you assemble markdown extensions yourself (without `prosemarkMarkdownSyntaxExtensions`), import `mathMarkdownSyntaxExtension` from `@prosemark/core` or `latexMathMarkdownSyntaxExtension` from `@prosemark/latex`, then still add `latexMarkdownSyntaxTheme` and `latexMarkdownEditorExtensions()` as above.

Exports at a glance:

| Export                             | Role                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `latexMathMarkdownSyntaxExtension` | LaTeX package entry point for the parser (today: same as core `mathMarkdownSyntaxExtension`) |
| `latexMarkdownSyntaxTheme`         | Delimiter and formula source highlighting                                                    |
| `latexMarkdownEditorExtensions()`  | Fold widgets that render with MathJax                                                        |

## How MathJax is loaded

Before the dynamic import runs in **`url-import`** mode (the default), this package sets `window.MathJax` with `skipStartupTypeset: true` and loader paths. MathJax’s startup must own the full `tex` / `svg` / `chtml` configuration—do not preconfigure conflicting `tex` options yourself.

### Runtime URL — `mathJaxLoadMode: 'url-import'` (default)

Omit `mathJaxPackageUrl` to use the built-in jsDelivr base, **or** pass any base URL for a full MathJax **npm-style** tree: your CDN, static files copied from `node_modules/mathjax`, a VS Code `vscode-resource` root, etc.

The URL must be absolute (`https://…` or same-origin). Point it at the **package root** (the folder that contains `tex-svg.js` / `tex-chtml.js` and the usual `input/`, `output/`, … layout). A trailing slash is optional.

```javascript
...latexMarkdownEditorExtensions({
  // mathJaxPackageUrl: 'https://example.com/my-mathjax-copy',
}),
```

`@prosemark/latex` does not read `node_modules` at runtime in this mode. Serving a copied tree under `public/` (or similar) is enough for self-hosting.

### Bundler — `mathJaxLoadMode: 'static-import'`

Add the **`mathjax`** package to your app and import a startup file from your code (usually `import 'mathjax/tex-svg.js'` or `tex-chtml.js` when using `output: 'html'`). Call [`preconfigureMathJaxLoader`](/api/prosemark/latex/functions/preconfiguremathjaxloader/) first only if you need a custom `loader.paths.mathjax`. `mathJaxPackageUrl` is ignored.

```javascript
import {
  preconfigureMathJaxLoader,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

// Optional, if lazy-loaded pieces need a known root:
// preconfigureMathJaxLoader('https://cdn.jsdelivr.net/npm/mathjax@4.1.1');

import 'mathjax/tex-svg.js';

...latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'static-import',
  output: 'svg',
}),
```

Do **not** mix `url-import` and `static-import` on the same page.

## Block vs inline (hybrid rules)

- `$$...$$` → always **block** (display).
- `$ ... $` with **leading or trailing space** inside the delimiters → **block**.
- `$...$` with no inner padding → **inline**.

## Options

```javascript
latexMarkdownEditorExtensions({
  output: 'svg', // default; use 'html' for CHTML if SVG is a problem
  renderCacheSize: 128, // LRU of rendered DOM trees; 0 to disable
  mathJaxLoadMode: 'url-import', // or 'static-import' when you bundle MathJax
  // mathJaxPackageUrl — only for url-import; omit for default jsDelivr
});
```

MathJax caches font paths (SVG `fontCache: 'global'`). This package adds an LRU cache of rendered DOM trees; set `renderCacheSize: 0` to disable.

When MathJax rejects a formula, the widget shows the error message inline (no console required).

## Styling

Rendered math and source highlighting use `--pm-*` variables on the editor root. See the [`@prosemark/latex` section on Styling](/reference/styling/#prosemarklatex) for variable names and defaults.

## Limitations

- **Browser only** — requires `window` and `document`.
- **One output mode per page** — the first successful load picks `svg` or `html`.
- **One MathJax load mode per page** — do not mix `url-import` and `static-import`.

Block replace widgets avoid vertical margins (padding only). The package calls [`requestMeasure`](https://codemirror.net/docs/ref/#view.EditorView.requestMeasure) after render and uses `ResizeObserver` when available so block math layout stays correct.

## Visual Studio Code

You do not need to wire `@prosemark/latex` yourself in VS Code. Install **[ProseMark - LaTeX math (MathJax) integration](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-latex-integration)** alongside the main ProseMark extension; it registers `@prosemark/latex` in the webview with a bundled MathJax build.

## Next steps

- [Getting Started](/guides/getting-started/) — base editor setup
- [Styling](/reference/styling/) — `--pm-latex-math-*` variables
- [Features](/reference/features/#prosemarklatex) — behavior summary
- [Fold, hide, and theme extensions](/reference/fold-hide-theme-extensions/) — how math fits the WYSIWYM model
