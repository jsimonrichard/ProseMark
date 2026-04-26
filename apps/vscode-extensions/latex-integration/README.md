# ProseMark for VS Code — LaTeX (MathJax) integration

Companion extension that enables **rendered math** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor for `$...$` and `$$...$$` using [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) (MathJax from the `mathjax` npm package).

**Requirements:** install and enable **ProseMark**. Dollar-delimited math is parsed by ProseMark’s default markdown setup (`mathMarkdownSyntaxExtension` in `@prosemark/core`); this extension adds MathJax **widgets** and the **syntax theme** in the webview.

Documentation for the libraries: https://prosemark.com

## How to use

1. Install **ProseMark** and this integration (it is listed in the ProseMark extension pack).
2. Open a `.md` file in ProseMark and fold math spans to see rendered output.

## Extension settings

None yet. MathJax options may be added later.

## Issues

Report bugs on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).
