---
title: LaTeX math (MathJax)
description: Set up @prosemark/latex to parse and render $...$ and $$...$$ math in your editor.
---

[`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) renders `$...$` and `$$...$$` math with [MathJax](https://www.mathjax.org/). The [demo](/demo) includes examples.

Math parsing lives in [`@prosemark/core`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/). This package adds MathJax widgets and highlighting. `latexMathMarkdownSyntaxExtension` is a **re-export** of core’s `mathMarkdownSyntaxExtension`.

API reference: [`@prosemark/latex` TypeDoc](/api/prosemark/latex/).

## Install

```bash
npm install @prosemark/latex
```

You also need `@prosemark/core` and the CodeMirror markdown packages ([Getting Started](/guides/getting-started/)).

MathJax is not bundled. By default it loads from jsDelivr at runtime. Add the optional **`mathjax`** npm package to self-host or use `static-import` mode.

## Enable math in the Markdown parser

`latexMarkdownEditorExtensions()` only attaches to **`Math`** syntax nodes. Without a math parser extension, `$...$` stays plain text.

Either:

- use [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/) (includes math), or
- add [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/) from core, or **`latexMathMarkdownSyntaxExtension`** (re-export) from this package.

## Wire up the editor

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
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    prosemarkBasicSetup(),
    prosemarkBaseThemeSetup(),
    ...latexMarkdownSyntaxTheme,
    ...latexMarkdownEditorExtensions(),
  ],
});
```

## How MathJax is loaded

### `url-import` (default)

Omit `mathJaxPackageUrl` for jsDelivr, or set it to an absolute URL for a MathJax package root (folder with `tex-svg.js` / `tex-chtml.js`).

```javascript
...latexMarkdownEditorExtensions({
  // mathJaxPackageUrl: 'https://example.com/mathjax',
}),
```

For self-hosting, copy `node_modules/mathjax` to static assets; this package does not read `node_modules` at runtime.

### `static-import`

Import MathJax in your app (e.g. `import 'mathjax/tex-svg.js'`), optionally call [`preconfigureMathJaxLoader`](/api/prosemark/latex/functions/preconfiguremathjaxloader/) first, then:

```javascript
...latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'static-import',
  output: 'svg',
}),
```

`mathJaxPackageUrl` is ignored in this mode.

## Block vs inline

- `$$...$$` — always block
- `$ ... $` (space inside delimiters) — block
- `$...$` (no inner padding) — inline

## Options

```javascript
latexMarkdownEditorExtensions({
  output: 'svg', // or 'html' for CHTML
  renderCacheSize: 128, // rendered DOM cache; 0 to disable
  mathJaxLoadMode: 'url-import',
});
```

Invalid formulas show an inline error in the widget.

## Styling

See [`--pm-latex-math-*` variables](/reference/styling/#prosemarklatex).

## Visual Studio Code

Install **[ProseMark - LaTeX math (MathJax) integration](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-latex-integration)** to render math in the ProseMark editor.
