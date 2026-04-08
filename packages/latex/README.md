# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` inline and `$$...$$` display, rendered with [MathJax](https://www.mathjax.org/) from the **`mathjax` npm package** (no CDN).

## Install

```bash
bun add @prosemark/latex
```

The `mathjax` package is bundled as a dependency; your app’s bundler (Vite, etc.) should include the `mathjax/tex-svg.js` or `mathjax/tex-chtml.js` chunk that gets loaded on first math render.

## Usage

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import {
  latexMathMarkdownSyntaxExtension,
  latexMarkdownSyntaxTheme,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

const extensions = [
  markdown({
    extensions: [
      GFM,
      prosemarkMarkdownSyntaxExtensions,
      latexMathMarkdownSyntaxExtension,
    ],
  }),
  // After your base / light theme:
  ...latexMarkdownSyntaxTheme,
  ...latexMarkdownEditorExtensions(),
];
```

- **`latexMathMarkdownSyntaxExtension`** — Lezer parser for the delimiters (put alongside other Markdown extensions).
- **`latexMarkdownSyntaxTheme`** — Colors `$` / `$$` vs the raw TeX body while the region is unfolded.
- **`latexMarkdownEditorExtensions()`** — Widgets that replace folded math with MathJax output.

### Options

```ts
latexMarkdownEditorExtensions({
  output: 'svg', // default; use 'html' for CHTML if SVG is a problem
  renderCacheSize: 128, // default; LRU of rendered trees, 0 to disable
});
```

## Caching

MathJax already caches font paths (SVG `fontCache: 'global'`). This package adds a small **LRU cache of rendered DOM trees** keyed by output mode, display flag, and source string. When you move the caret and the same formula folds again, the widget **clones** a cached node instead of calling `tex2svgPromise` / `tex2chtmlPromise`, which removes most of the “tiny delay” on refold. Set `renderCacheSize: 0` if you prefer not to keep rendered nodes in memory.

## Limitations

- **Browser only** — needs `window` and `document`.
- **One output mode per page** — the first successful load picks `svg` or `html`; switching modes in the same tab is not supported.
