# ProseMark for VS Code — LaTeX (MathJax) integration

Companion extension that enables **rendered math** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor for `$...$` and `$$...$$` using [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) (dependent on MathJax from the `mathjax` npm package).

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
