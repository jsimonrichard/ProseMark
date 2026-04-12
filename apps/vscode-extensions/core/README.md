# ProseMark for VS Code

A "What You See Is What You Mean" Markdown editor for Visual Studio Code, inspired by editors like Typora and Obsidian. ProseMark provides a seamless writing experience where you can focus on your content without being distracted by Markdown syntax.

The extension can be downloaded on either of these marketplaces:

- The Official VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark
- Open VSX: https://open-vsx.org/extension/jsimonrichard/vscode-prosemark

The documentation for the ProseMark libraries can be found at https://prosemark.com.

## Features

- **Live Preview:** Renders your Markdown as you type, giving you a beautiful and clean representation of your document.
- **Familiar Feel:** If you've used editors like Typora or Obsidian, you'll feel right at home with ProseMark.

### Companion extensions (extension pack)

The published **ProseMark** extension lists companion extensions so installs get common features by default:

- **Spellcheck:** webview UI from [`@prosemark/spellcheck-frontend`](https://www.npmjs.com/package/@prosemark/spellcheck-frontend). Dictionary-backed checking uses [**ProseMark - Code Spell Checker (cSpell) Integration**](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-cspell-integration) with [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

- **LaTeX math:** [**ProseMark - LaTeX math (MathJax) integration**](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-latex-integration) loads [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) in the webview so folded `$...$` / `$$...$$` renders with MathJax.

## How to Use

1.  Open any file with a `.md` extension.
2.  ProseMark will automatically open as the editor for that file.

## Extension Settings

This extension does not currently contribute any settings to VS Code.

## Known Issues

No known issues at this time.

Please report any bugs or feature requests on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).
