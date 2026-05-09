# @prosemark/latex

LaTeX-style math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered with [MathJax](https://www.mathjax.org/) loaded at **runtime** from your chosen package root (default: **jsDelivr**, pinned to the same MathJax version this package is tested against).

The **`Math` / `MathMark` / `MathFormula`** Lezer nodes and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** and are part of **`prosemarkMarkdownSyntaxExtensions`**. This package adds MathJax **widgets** and theme helpers; it **re-exports** the parser under **`latexMath*`** names if you only depend on `@prosemark/latex`.

## Install

```bash
bun add @prosemark/latex
```

Optionally add **`mathjax`** if you want to self-host it from npm (see below). It is an **optional peer dependency**; any 4.x release you choose is fine.

MathJax is **not** bundled into `@prosemark/latex`. By default (`mathJaxLoadMode: 'url-import'`), the package sets `window.MathJax`, then dynamically imports **either** `tex-svg.js` **or** `tex-chtml.js` (for `output`) from **`mathJaxPackageUrl`** (default: jsDelivr).

With `mathJaxLoadMode: 'static-import'`, **your app** loads that file (e.g. `import 'mathjax/tex-svg.js'`), and this package only waits for `startup.promise`; **`mathJaxPackageUrl` is not used**. Use {@link preconfigureMathJaxLoader} before your static import when you need a custom `loader.paths.mathjax`.

This avoids bare specifiers like `import('mathjax/tex-svg.js')` in the **published** `@prosemark/latex` build; your application bundler can still resolve a **static** `import 'mathjax/...'` in **your** source.

Before the dynamic import runs (url mode), this package sets `window.MathJax = { options: { skipStartupTypeset: true }, loader: { paths: { … } } }`. MathJax’s startup must own the full `tex` / `svg` / `chtml` configuration.

### How to load MathJax (you choose)

**1. CDN / URL (default, `mathJaxLoadMode: 'url-import'`)** — No npm `mathjax` install required. Omit **`mathJaxPackageUrl`** to use jsDelivr for a pinned version (see `MATHJAX_VERSION` in the source), or pass your own absolute URL (self-hosted tree, `public/mathjax`, VS Code webview URI, etc.).

**2. npm + static files (still `url-import`)** — Install `mathjax`, then **serve the package directory unchanged** (same layout as in `node_modules/mathjax`). Set **`mathJaxPackageUrl`** to the **browser-reachable absolute URL** of that folder.

For example, with **Vite**, copy the package into `public` so it is served as static assets:

```bash
# one-time or in a postinstall script — keep the full tree (input/, output/, etc.)
cp -R node_modules/mathjax public/mathjax
```

Then point the editor at that folder (adjust if you use a non-root `base`):

```ts
const mathJaxPackageUrl = new URL(
  `${import.meta.env.BASE_URL}mathjax`,
  window.location.href,
).href;

latexMarkdownEditorExtensions({
  mathJaxPackageUrl,
});
```

You can instead use a build plugin (for example [`vite-plugin-static-copy`](https://github.com/sapphi-red/vite-plugin-static-copy)) to copy `node_modules/mathjax` into `dist` under a stable path—what matters is only that the URL you pass matches a directory that still looks like the published npm package.

**3. Fully custom URL** — Host the same tree on your own CDN or path; set **`mathJaxPackageUrl`**.

**4. Bundler static import (`mathJaxLoadMode: 'static-import'`)** — Add `mathjax` to your app and import the startup component from **your** entry (or a module that runs before the editor), so Vite/Rollup/esbuild resolve and chunk it:

```ts
import {
  preconfigureMathJaxLoader,
  awaitMathJaxAfterStaticImport,
  latexMarkdownEditorExtensions,
} from '@prosemark/latex';

// Optional: only if MathJax must load extra files from a known root (fonts, etc.)
preconfigureMathJaxLoader('https://cdn.jsdelivr.net/npm/mathjax@4.1.1');

await import('mathjax/tex-svg.js'); // or tex-chtml.js for output: 'html'
await awaitMathJaxAfterStaticImport('svg');

// Later:
latexMarkdownEditorExtensions({
  mathJaxLoadMode: 'static-import',
  output: 'svg',
});
```

**`mathJaxPackageUrl` is ignored** in this mode. You own `window.MathJax` until the startup module runs; use **`preconfigureMathJaxLoader`** when the default bundled paths would break lazy loads.

**Note:** `@prosemark/latex` does not read from `node_modules` at runtime. If you install `mathjax` only to copy it into `public/` (or similar), that is enough—you are not required to ship `node_modules` to production.

## Usage

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
