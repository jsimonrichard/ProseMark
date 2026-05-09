# ProseMark for VS Code — LaTeX (MathJax) integration

Companion extension that enables **rendered math** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor for `$...$` and `$$...$$` using [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex).

The webview loads MathJax from a copy of the **`mathjax` npm package** shipped inside this extension (`dist/webview/mathjax`), built with `scripts/copy-mathjax-for-webview.mjs` after `vite build`. The extension host passes a `vscode-resource` URL for that folder into `latexMarkdownEditorExtensions({ mathJaxPackageUrl })`, so the editor works offline without relying on a public CDN.

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

After `bun install`, run `bun run build`. The build runs **Vite** for `dist/webview/webview.js`, then copies `node_modules/mathjax` into `dist/webview/mathjax`. If you change the pinned `mathjax` version in `package.json`, run a full build so the webview copy stays in sync.
