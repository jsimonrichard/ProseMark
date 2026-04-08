# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` inline and `$$...$$` display, rendered with [MathJax](https://www.mathjax.org/) from the **`mathjax` npm package** (no CDN).

## Install

```bash
bun add @prosemark/latex
```

The `mathjax` package is bundled as a dependency (`import('mathjax/tex-svg.js')` or `tex-chtml.js`). MathJax’s loader must resolve extra files (inputs, fonts, etc.): when those components are bundled into an app chunk, the default root path is `/`, which makes runtime requests hit your dev server and hang. This package sets `loader.paths.mathjax` to the matching version on **jsDelivr** so those loads succeed. If you need a fully air‑gapped setup, host the `mathjax` npm folder yourself and override that path (or use a Vite alias + `public/` copy).

Before that import runs, this package only sets `window.MathJax = { options: { skipStartupTypeset: true } }`. MathJax’s own startup code must own the full `tex` / `svg` / `chtml` configuration; a richer pre-existing `window.MathJax` without `version` would be merged incorrectly and break rendering.

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
- **`latexMarkdownSyntaxTheme`** — `$` / `$$` use link blue (`--pm-link-color`); the raw TeX body uses normal text color (override with `--pm-latex-math-formula-color`).
- **`latexMarkdownEditorExtensions()`** — Widgets that replace folded math with MathJax output.

### Options

```ts
latexMarkdownEditorExtensions({
  output: 'svg', // default; use 'html' for CHTML if SVG is a problem
  renderCacheSize: 128, // default; LRU of rendered trees, 0 to disable
  // mathJaxPackageUrl: 'https://your.cdn/mathjax@4.1.1', // optional self-host
});
```

## Caching

MathJax already caches font paths (SVG `fontCache: 'global'`). This package adds a small **LRU cache of rendered DOM trees** keyed by output mode, display flag, and source string. When you move the caret and the same formula folds again, the widget **clones** a cached node instead of calling `tex2svgPromise` / `tex2chtmlPromise`, which removes most of the “tiny delay” on refold. Set `renderCacheSize: 0` if you prefer not to keep rendered nodes in memory.

## Limitations

- **Browser only** — needs `window` and `document`.
- **One output mode per page** — the first successful load picks `svg` or `html`; switching modes in the same tab is not supported.

Block widgets use `ResizeObserver` (where available) so the editor remeasures line heights after MathJax updates the DOM; without it, folded display math could keep a stale height until the next edit.

After MathJax renders, the package sets `viewState.mustMeasureContent` and calls CodeMirror’s internal **`EditorView#measure(true)`** (with a double `requestAnimationFrame` and a layout read on the wrapper). Relying only on `requestMeasure()` can leave the height map stale because the outer measure loop may not re-run `measureVisibleLineHeights` in the same way.

**Debugging in the browser:** in devtools, after `window.editor` exists:

```js
const Ev = window.editor.constructor;
const _m = Ev.prototype.measure;
Ev.prototype.measure = function (f) {
  console.log('measure', { mmc: this.viewState.mustMeasureContent, flush: f });
  return _m.call(this, f);
};
const _r = Ev.prototype.requestMeasure;
Ev.prototype.requestMeasure = function (req) {
  console.log('requestMeasure', { mmc: this.viewState.mustMeasureContent, hasReq: !!req });
  return _r.call(this, req);
};
```

Then fold math and watch the log order. `ViewState.measure` (inner) returning flag `4` (viewport) defers custom `MeasureRequest` reads to the next cycle—see `@codemirror/view`’s `EditorView.measure` implementation.
