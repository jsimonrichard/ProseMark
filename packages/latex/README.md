# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered with [MathJax](https://www.mathjax.org/) from the **`mathjax` npm package**.

The **`Math` / `MathMark` / `MathFormula`** Lezer nodes and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** and are part of **`prosemarkMarkdownSyntaxExtensions`**. This package adds MathJax **widgets** and theme helpers; it **re-exports** the parser under **`latexMath*`** names if you only depend on `@prosemark/latex`.

## Install

```bash
bun add @prosemark/latex
```

The `mathjax` package is a dependency (`import('mathjax/tex-svg.js')` or `tex-chtml.js`). By default, `loader.paths.mathjax` points at **jsDelivr** for the pinned version so the runtime can load extra components. Override with **`mathJaxPackageUrl`** for self-hosting or another CDN.

Before that import runs, this package sets `window.MathJax = { options: { skipStartupTypeset: true }, loader: { paths: { … } } }`. MathJax’s startup must own the full `tex` / `svg` / `chtml` configuration.

## Usage

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import { latexMarkdownSyntaxTheme, latexMarkdownEditorExtensions } from '@prosemark/latex';

const extensions = [
  markdown({
    extensions: [
      GFM,
      prosemarkMarkdownSyntaxExtensions, // includes mathMarkdownSyntaxExtension (Math nodes)
    ],
  }),
  ...latexMarkdownSyntaxTheme,
  ...latexMarkdownEditorExtensions(),
];
```

If you **do not** use `prosemarkMarkdownSyntaxExtensions`, add the parser from core (or the latex re-export):

```ts
import { mathMarkdownSyntaxExtension } from '@prosemark/core';
// or: import { latexMathMarkdownSyntaxExtension } from '@prosemark/latex';
```

- **`latexMathMarkdownSyntaxExtension`** — same as **`mathMarkdownSyntaxExtension`** from core (re-export).
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
  // mathJaxPackageUrl: 'https://cdn.jsdelivr.net/npm/mathjax@4.1.1/',
});
```

## Caching

MathJax caches font paths (SVG `fontCache: 'global'`). This package adds an **LRU cache of rendered DOM trees**. Set `renderCacheSize: 0` to disable.

## Limitations

- **Browser only** — needs `window` and `document`.
- **One output mode per page** — the first successful load picks `svg` or `html`.

### Block widgets and layout

Block replace widgets should not use **vertical margins**; use padding. This package calls **`requestMeasure`** after render and uses **`ResizeObserver`** when available.

See [Decoration.widget](https://codemirror.net/docs/ref/#view.Decoration%5Ewidget) and [requestMeasure](https://codemirror.net/docs/ref/#view.EditorView.requestMeasure).
