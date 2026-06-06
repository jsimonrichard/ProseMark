# ProseMark for VS Code — LaTeX (MathJax) integration

Companion extension that enables **rendered math** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor for `$...$` and `$$...$$` using [**MathJax**](https://www.mathjax.org/) and [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex).

The documentation for the ProseMark libraries can be found at https://prosemark.com.

## Features

- Renders LaTeX using MathJax
- Since parsing is done in the core extension, hybrid rules (based on LaTeX and Typst) are used to decide the render mode: double dollar signs (`$$...$$`) and dollar signs with padding (`$ ... $`) are rendered in display mode; single, unpadded dollar signs `$...$` are rendered in inline mode.

## How to use

1. Install **ProseMark** and this **ProseMark - LaTeX math** integration.
2. Open a `.md` file in ProseMark and fold math spans to see rendered output.

## Extension settings

This extension does not contribute VS Code settings yet.

## Known issues

Please report bugs on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).

## Developing this extension

After `bun install`, run `bun run build`. **Vite** produces `dist/webview/webview.js` and copies `tex-svg.js` plus `sre/` from the **`mathjax`** npm package into `dist/webview/mathjax/` via `@prosemark/latex/vite-plugin-mathjax`. The webview loads MathJax with `url-import` from that folder. Bump the **`mathjax`** dependency when you want a different MathJax version.

### MathJax load modes

This extension uses **`url-import`**: the extension host passes a webview URL for `dist/webview/mathjax/`, and the webview dynamically imports `tex-svg.js` from there. That keeps `webview.js` small and lets MathJax load `sre/speech-worker.js` as a separate file (copied by the Vite plugin).

If you switch to **`static-import`** (`import 'mathjax/tex-svg.js'` bundled into `webview.js`), note that the combined `tex-svg` startup includes MathJax **a11y** support. It tries to load **`sre/speech-worker.js` as a web worker** at runtime. A bundler usually only emits your main bundle, so the worker is missing unless you handle it explicitly.

Pick one approach:

1. **Disable a11y** (simplest for editor preview) — set options on `window.MathJax` **before** the static import:

   ```ts
   window.MathJax = {
     startup: {
       typeset: false,
     },
     options: {
       enableSpeech: false,
       enableBraille: false,
       enableEnrichment: false,
       menuOptions: {
         settings: { enrich: false, speech: false, braille: false },
       },
     },
   };
   import 'mathjax/tex-svg.js';
   ```

2. **Keep a11y** — copy `sre/` from the `mathjax` npm package next to where `tex-svg.js` is served, and point MathJax at that root (for example with `preconfigureMathJaxLoader` and `loader.paths.mathjax`, or `@prosemark/latex/vite-plugin-mathjax` with `url-import`). The worker cannot be inlined into an IIFE the way the main startup script can.

The shipped extension uses **url-import + copied `sre/`** so math renders without bundling ~1.8 MB of MathJax into `webview.js`.
