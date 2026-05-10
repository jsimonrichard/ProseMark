# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered with [MathJax](https://www.mathjax.org/) loaded at **runtime** from your chosen package root (default: **jsDelivr**, pinned to the same MathJax version this package is tested against).

The **`Math` / `MathMark` / `MathFormula`** Lezer nodes and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** and are part of **`prosemarkMarkdownSyntaxExtensions`**. This package adds MathJax **widgets** and theme helpers; it **re-exports** the parser under **`latexMath*`** names if you only depend on `@prosemark/latex`.

### Parser: you must enable math in Markdown

**`latexMarkdownEditorExtensions()` only runs on `Math` syntax nodes.** If the Markdown layer never parses `$...$` / `$$...$$` as math, those widgets never attach and formulas stay plain text.

Do **one** of the following:

- Pass **`prosemarkMarkdownSyntaxExtensions`** from **`@prosemark/core`** inside **`markdown({ extensions: [...] })`** (it already includes **`mathMarkdownSyntaxExtension`**), **or**
- Add **`mathMarkdownSyntaxExtension`** from **`@prosemark/core`**, **or** **`latexMathMarkdownSyntaxExtension`** from **`@prosemark/latex`** (for now, a re-export of the same extension), to **`markdown({ extensions: [...] })`**.

## Install

```bash
bun add @prosemark/latex
```

Optionally add **`mathjax`** if you want to self-host it from npm (see below). It is an **optional peer dependency**; any 4.x release you choose is fine.

MathJax is **not** bundled into `@prosemark/latex`. See **How to load MathJax** below for **`url-import`** (default) vs **`static-import`**.

Before the dynamic import runs in **`url-import`** mode, this package sets `window.MathJax = { options: { skipStartupTypeset: true }, loader: { paths: { … } } }`. MathJax’s startup must own the full `tex` / `svg` / `chtml` configuration.

### How to load MathJax

**1. Runtime URL — `mathJaxLoadMode: 'url-import'` (default)**  
Omit **`mathJaxPackageUrl`** to use the built-in jsDelivr base (see `MATHJAX_VERSION` in the source), **or** pass any base URL for a full MathJax **npm-style** tree: a public CDN, your own host, a copy of `node_modules/mathjax` served as static files, a VS Code `vscode-resource` root, etc.

> **URL:** must be an absolute address the browser can load (`https://…` or same-origin). Point it at the **package root** (the folder that contains `tex-svg.js` / `tex-chtml.js` and the usual `input/`, `output/`, … layout). A trailing slash is optional.

```ts
latexMarkdownEditorExtensions({
  // mathJaxPackageUrl: 'https://example.com/my-mathjax-copy',
});
```

**2. Bundler — `mathJaxLoadMode: 'static-import'`**  
Add the **`mathjax`** package to your app and load the startup file from your code (usually a top-level `import 'mathjax/tex-svg.js'` or `tex-chtml.js` for `output: 'html'`). Call **`preconfigureMathJaxLoader`** first only if you need a custom `loader.paths.mathjax`. **`mathJaxPackageUrl`** is ignored.

```ts
import {
  preconfigureMathJaxLoader,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

// Optional, if lazy-loaded pieces need a known root:
// preconfigureMathJaxLoader('https://cdn.jsdelivr.net/npm/mathjax@4.1.1');

import 'mathjax/tex-svg.js';

latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'static-import',
  output: 'svg',
});
```

**Note:** `@prosemark/latex` does not read `node_modules` at runtime for `url-import`. Serving a copied tree under `public/` (or similar) is enough for self-hosting. You still need the **parser** section above so `Math` nodes exist.

## Usage

**Full ProseMark markdown** (math included):

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import {
  latexMarkdownSyntaxTheme,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

const extensions = [
  markdown({
    extensions: [
      GFM,
      prosemarkMarkdownSyntaxExtensions, // includes mathMarkdownSyntaxExtension → Math nodes
    ],
  }),
  ...latexMarkdownSyntaxTheme,
  ...latexMarkdownEditorExtensions(),
];
```

**Math only** (if you assemble Markdown extensions yourself):

```ts
import { mathMarkdownSyntaxExtension } from '@prosemark/core';
// or: import { latexMathMarkdownSyntaxExtension } from '@prosemark/latex';

markdown({
  extensions: [
    GFM,
    mathMarkdownSyntaxExtension,
    // …your other markdown extensions
  ],
});
```

Then add **`latexMarkdownSyntaxTheme`** and **`latexMarkdownEditorExtensions()`** as in the first example.

- **`latexMathMarkdownSyntaxExtension`** — for now, a re-export of **`mathMarkdownSyntaxExtension`** from core.
- **`latexMarkdownSyntaxTheme`** — delimiter and formula highlighting.
- **`latexMarkdownEditorExtensions()`** — fold widgets with MathJax.

### Block vs inline (hybrid)

- **`$$...$$`** → always **block** (display).
- **`$ ... $`** with **leading or trailing space** inside the delimiters → **block**.
- **`$...$`** with no inner padding → **inline**.

### Options

```ts
latexMarkdownEditorExtensions({
  output: 'svg', // default; use 'html' for CHTML if SVG is a problem
  renderCacheSize: 128, // default; LRU of rendered trees, 0 to disable
  mathJaxLoadMode: 'url-import', // default; use 'static-import' if you load MathJax via your bundler
  // mathJaxPackageUrl — only for url-import; omit for default jsDelivr
});
```

## Caching

MathJax caches font paths (SVG `fontCache: 'global'`). This package adds an **LRU cache of rendered DOM trees**. Set `renderCacheSize: 0` to disable.

## Limitations

- **Browser only** — needs `window` and `document`.
- **One output mode per page** — the first successful load picks `svg` or `html`.
- **One MathJax load mode per page** — do not mix `url-import` and `static-import`.

### Block widgets and layout

Block replace widgets should not use **vertical margins**; use padding. This package calls **`requestMeasure`** after render and uses **`ResizeObserver`** when available.

See [Decoration.widget](https://codemirror.net/docs/ref/#view.Decoration%5Ewidget) and [requestMeasure](https://codemirror.net/docs/ref/#view.EditorView.requestMeasure).
