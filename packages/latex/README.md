# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered with [MathJax](https://www.mathjax.org/) loaded at **runtime** from your chosen package root (default: **jsDelivr**, pinned to the same MathJax version this package is tested against).

**Full setup guide:** [prosemark.com/guides/latex-math](https://prosemark.com/guides/latex-math/)

**`Math` / `MathMark` / `MathFormula`** and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** (included in **`prosemarkMarkdownSyntaxExtensions`**). This package adds MathJax widgets and theme helpers. **`latexMath*`** exports are re-exports of the core math parser symbols.

### Parser: you must enable math in Markdown

**`latexMarkdownEditorExtensions()` only runs on `Math` syntax nodes.** If the Markdown layer never parses `$...$` / `$$...$$` as math, those widgets never attach and formulas stay plain text.

Do **one** of the following:

- Pass **`prosemarkMarkdownSyntaxExtensions`** from **`@prosemark/core`** inside **`markdown({ extensions: [...] })`** (it already includes **`mathMarkdownSyntaxExtension`**), **or**
- Add **`mathMarkdownSyntaxExtension`** from **`@prosemark/core`**, **or** **`latexMathMarkdownSyntaxExtension`** (re-export) from **`@prosemark/latex`**, to **`markdown({ extensions: [...] })`**.

## Install

```bash
bun add @prosemark/latex
```

Optionally add **`mathjax`** if you want to self-host it from npm (see below). It is an **optional peer dependency**; any 4.x release you choose is fine.

MathJax is **not** bundled into `@prosemark/latex`. See **How to load MathJax** below for **`url-import`** (default) vs **`static-import`**.

Before the dynamic import runs in **`url-import`** mode, this package sets `window.MathJax = { startup: { typeset: false }, loader: { paths: { … } } }`. MathJax’s startup must own the full `tex` / `svg` / `chtml` configuration.

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

**Accessibility / speech worker:** the combined `tex-svg.js` / `tex-chtml.js` startup includes MathJax a11y extensions. At runtime it loads **`sre/speech-worker.js` as a separate web worker** (blob worker + `importScripts`). In a normal browser, copy `sre/` next to the startup file (or use `@prosemark/latex/vite-plugin-mathjax`’s default copy list) and point `loader.paths.mathjax` at that root.

**Stock VS Code webviews** cannot `importScripts` extension resource URLs inside workers ([docs](https://code.visualstudio.com/api/extension-guides/webview#using-web-workers)), so copying `sre/` is not enough — pass **`enableMathJaxA11y: false`** (url-import) or disable a11y before a static import; otherwise `tex2svgPromise` may hang forever. (Cursor’s webview allows the `importScripts`; the ProseMark latex VS Code extension enables a11y only there.)

```ts
// url-import (VS Code webview, etc.)
latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'url-import',
  mathJaxPackageUrl,
  enableMathJaxA11y: false,
});

// static-import — before importing tex-svg / tex-chtml:
preconfigureMathJaxLoader(packageUrl, { enableA11y: false });
import 'mathjax/tex-svg.js';
```

**Note:** `@prosemark/latex` does not read `node_modules` at runtime for `url-import`. Serving a copied tree under `public/` (or similar) is enough for self-hosting. `@prosemark/latex/vite-plugin-mathjax` can copy selected files from the `mathjax` package into your build output (the VS Code latex extension copies `tex-svg.js` only). You still need the **parser** section above so `Math` nodes exist.

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

- **`latexMathMarkdownSyntaxExtension`** — re-export of **`mathMarkdownSyntaxExtension`** from core.
- **`latexMarkdownSyntaxTheme`** — delimiter and formula highlighting.
- **`latexMarkdownEditorExtensions()`** — fold widgets with MathJax.

### Styling (CSS variables)

Rendered math widgets and source highlighting use `--pm-*` variables on the editor root:

| Variable                                 | Purpose                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `--pm-latex-math-delimiter-color`        | `$` / `$$` delimiter color (defaults to `--pm-link-color`)        |
| `--pm-latex-math-formula-color`          | Raw formula text before render                                    |
| `--pm-latex-math-formula-font`           | Monospace stack for formula source (defaults to `--pm-code-font`) |
| `--pm-latex-math-error-color`            | Failed render message (defaults to `--pm-syntax-invalid`)         |
| `--pm-latex-math-error-background-color` | Failed render background (defaults to semi-transparent gray)      |

When MathJax rejects a formula, the widget shows the error message inline (no console required).

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
