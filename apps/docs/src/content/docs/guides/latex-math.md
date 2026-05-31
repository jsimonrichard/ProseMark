---
title: LaTeX math (MathJax)
description: Set up @prosemark/latex to parse and render $...$ and $$...$$ math in your editor.
---

[`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) adds **rendered math** to a ProseMark Markdown editor: `$...$` and `$$...$$` are parsed as `Math` syntax nodes and displayed with [MathJax](https://www.mathjax.org/). The [demo](/demo) includes math you can edit to see inline and block behavior.

This guide covers install, enabling the Markdown **parser**, wiring **editor extensions**, and choosing how **MathJax** loads. API details are in the [`@prosemark/latex` TypeDoc](/api/prosemark/latex/).

Parsing (`Math` / `MathMark` / `MathFormula` and [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/)) lives in **`@prosemark/core`**, included in [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/). **`@prosemark/latex`** adds MathJax widgets, delimiter highlighting, and related theme helpers. **`latexMathMarkdownSyntaxExtension`** is a re-export of core’s `mathMarkdownSyntaxExtension` if you prefer to import the parser from the same package as the renderer.

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
- Add [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/) from `@prosemark/core`, **or** `latexMathMarkdownSyntaxExtension` (re-export) from `@prosemark/latex`, to your markdown extensions.

## Wire up the editor

Add the LaTeX **syntax theme** and **editor extensions** alongside your existing ProseMark setup:

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

If you assemble markdown extensions yourself (without `prosemarkMarkdownSyntaxExtensions`), import `mathMarkdownSyntaxExtension` from `@prosemark/core` or `latexMathMarkdownSyntaxExtension` from `@prosemark/latex`, then add `latexMarkdownSyntaxTheme` and `latexMarkdownEditorExtensions()` as above.

| Export                             | Role                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `latexMathMarkdownSyntaxExtension` | Re-export of `mathMarkdownSyntaxExtension` from core |
| `latexMarkdownSyntaxTheme`         | Delimiter and formula source highlighting            |
| `latexMarkdownEditorExtensions()`  | Fold widgets that render with MathJax                |

## How MathJax is loaded

In **`url-import`** mode (the default), this package sets `window.MathJax` with `skipStartupTypeset: true` and loader paths, then dynamically imports the startup bundle. Do not set conflicting `tex` / `svg` / `chtml` options on `window.MathJax` yourself before that runs.

### Runtime URL — `mathJaxLoadMode: 'url-import'` (default)

Omit `mathJaxPackageUrl` to use the built-in jsDelivr base, **or** pass a base URL for a full MathJax **npm-style** tree (your CDN, static files copied from `node_modules/mathjax`, etc.).

The URL must be absolute (`https://…` or same-origin). Point it at the **package root** (the folder that contains `tex-svg.js` / `tex-chtml.js`). A trailing slash is optional.

```javascript
...latexMarkdownEditorExtensions({
  // mathJaxPackageUrl: 'https://example.com/my-mathjax-copy',
}),
```

`@prosemark/latex` does not read `node_modules` at runtime in this mode. Serving a copied tree under `public/` is enough for self-hosting.

### Bundler — `mathJaxLoadMode: 'static-import'`

Add the **`mathjax`** package to your app and import a startup file (for example `import 'mathjax/tex-svg.js'`, or `tex-chtml.js` when using `output: 'html'`). Call [`preconfigureMathJaxLoader`](/api/prosemark/latex/functions/preconfiguremathjaxloader/) first only if you need a custom `loader.paths.mathjax`. `mathJaxPackageUrl` is ignored.

```javascript
import {
  preconfigureMathJaxLoader,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

// Optional:
// preconfigureMathJaxLoader('https://cdn.jsdelivr.net/npm/mathjax@4.1.1');

import 'mathjax/tex-svg.js';

...latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'static-import',
  output: 'svg',
}),
```

Use one load mode per page (`url-import` or `static-import`, not both).

## Block vs inline

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

This package caches rendered DOM trees (`renderCacheSize`; set to `0` to disable). When MathJax rejects a formula, the widget shows the error inline.

## Styling

Rendered math and source highlighting use `--pm-*` variables on the editor root. See the [`@prosemark/latex` section on Styling](/reference/styling/#prosemarklatex) for variable names and defaults.

## Visual Studio Code

To render math in the ProseMark VS Code editor, install **[ProseMark - LaTeX math (MathJax) integration](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-latex-integration)**.
