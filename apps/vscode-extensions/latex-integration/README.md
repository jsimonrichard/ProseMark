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

- **MathJax SRE / speech in Visual Studio Code** — unsupported; a11y is disabled so formulas still render. See [Why MathJax SRE (speech) is off in Visual Studio Code](#why-mathjax-sre-speech-is-off-in-visual-studio-code). Cursor keeps SRE on.

Please report bugs on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).

## Developing this extension

After `bun install`, run `bun run build`. **Vite** produces `dist/webview/webview.js` and copies `tex-svg.js` plus `sre/` from the **`mathjax`** npm package into `dist/webview/mathjax/` via `@prosemark/latex/vite-plugin-mathjax`. The webview loads MathJax with `url-import` from that folder (package URL from `webview.asWebviewUri`). Bump the **`mathjax`** dependency when you want a different MathJax version.

### MathJax load modes

This extension uses **`url-import`**: the extension host passes a webview URL for `dist/webview/mathjax/`, and the webview dynamically imports `tex-svg.js` from there. That keeps `webview.js` small (~47 KB) instead of bundling ~1.8 MB of MathJax into the IIFE.

### Why MathJax SRE (speech) is off in Visual Studio Code

MathJax’s combined `tex-svg` startup enables accessibility by default. At runtime it starts SRE roughly like this:

1. Create a **blob** (or `data:`) worker — VS Code allows this.
2. Inside that worker, call **`importScripts(<webview-url>/sre/speech-worker.js)`**.

Stock VS Code webviews **do not allow** `importScripts` (or dynamic `import`) of extension / webview resource URLs inside workers. Official docs: [Using Web Workers](https://code.visualstudio.com/api/extension-guides/webview#using-web-workers). The failure looks like:

```text
NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope':
The script at 'https://file+.vscode-resource.vscode-cdn.net/…/sre/speech-worker.js' failed to load.
```

After that, `tex2svgPromise` never settles, so math widgets stay empty. Copying `sre/` next to `tex-svg.js` (and serving it via `asWebviewUri`) does **not** fix this — the file is already loadable as a normal resource; the block is specifically `importScripts` in a worker.

**Cursor** allows that `importScripts`, so this extension enables MathJax a11y when `vscode.env.appName` contains `"Cursor"` and leaves it disabled for Visual Studio Code and other hosts (fail closed). See `src/host-mathjax-a11y.ts`.

If you switch this extension to **`static-import`**, keep the same host split (or always disable a11y) — see `@prosemark/latex` README.
