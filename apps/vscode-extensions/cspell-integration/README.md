# ProseMark for VS Code - CSpell Integration

Companion extension that connects [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) to the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) (cSpell) extension. Spell results from cSpell are shown inside the ProseMark editor using [`@prosemark/spellcheck-frontend`](https://www.npmjs.com/package/@prosemark/spellcheck-frontend) (underlines, suggestion tooltips, and cSpell-aligned actions).

**Requirements:** install and enable both **ProseMark** and **Code Spell Checker**. This extension does not replace cSpell; it bridges cSpell diagnostics into ProseMark’s CodeMirror surface.

ProseMark is a "What You See Is What You Mean" Markdown editor for Visual Studio Code, inspired by editors like Typora and Obsidian. ProseMark provides a seamless writing experience where you can focus on your content without being distracted by Markdown syntax.

The documentation for the ProseMark libraries can be found at https://prosemark.com.

## Features

- **cSpell in ProseMark:** Uses your existing Code Spell Checker configuration and dictionaries while editing Markdown in ProseMark.
- **Live Preview:** Renders your Markdown as you type, giving you a beautiful and clean representation of your document.
- **Familiar Feel:** If you've used editors like Typora or Obsidian, you'll feel right at home with ProseMark.

## How to Use

1.  Open any file with a `.md` extension.
2.  ProseMark will automatically open as the editor for that file.

## Extension Settings

This extension does not currently contribute any settings to VS Code.

## Known Issues

No known issues at this time.

Please report any bugs or feature requests on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).
