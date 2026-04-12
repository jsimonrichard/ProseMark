# ProseMark for VS Code — LaTeX (MathJax) integration

Companion extension that enables **rendered math** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor for `$...$` and `$$...$$` using [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) (MathJax from the `mathjax` npm package).

**Requirements:** install and enable **ProseMark**. Dollar-delimited math is already parsed by ProseMark’s default markdown setup (`mathMarkdownSyntaxExtension` in `@prosemark/core`); this extension only adds the MathJax **widgets** and **syntax theme** in the webview.

The documentation for the ProseMark libraries can be found at https://prosemark.com.

## Features

- Inline and display math in the ProseMark WYSIWYM surface (hybrid rules: `$$...$$` always display; padded `$ ... $` display; tight `$...$` inline).

## How to use

1. Install **ProseMark** and this **ProseMark - LaTeX math** integration.
2. Open a `.md` file in ProseMark and fold math spans to see rendered output.

## Extension settings

This extension does not contribute VS Code settings yet. MathJax options (SVG vs HTML, optional `mathJaxPackageUrl`) can be added later via configuration.

## Known issues

Please report bugs on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).
