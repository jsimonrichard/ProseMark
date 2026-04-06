# 🪶 ProseMark

[ProseMark VS Code Extension](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) | [Demo](https://prosemark.com/demo/)

**ProseMark** is a modular toolkit for building "What You See Is What You Mean" (WYSIWYM) markdown editors, a type of editor that merges the look of rendered markdown into the editor itself rather than rendering the markdown in a separate window. Two of the most well-known editors of this type are [Obsidian](https://obsidian.md/) and [Typora](https://typora.io/).

This project is structured as a set of extensions for [CodeMirror 6](https://codemirror.net/), and is broken up into the following packages:

- **[`@prosemark/core`](https://www.npmjs.com/package/@prosemark/core):** the core functionality needed for the WYSIWYM editor.
- **[`@prosemark/render-html`](https://www.npmjs.com/package/@prosemark/render-html):** renders blocks of HTML code inside code fences.
- **[`@prosemark/paste-rich-text`](https://www.npmjs.com/package/@prosemark/paste-rich-text):** enables pasting formatted rich text into the editor.
- **[`@prosemark/spellcheck-frontend`](https://www.npmjs.com/package/@prosemark/spellcheck-frontend):** CodeMirror UI for spellcheck (underlines, suggestion tooltips, optional custom actions). You plug in your own spell engine and issue source; see the package README and [demo](https://prosemark.com/demo/).

## Features

- Inline styling including _italics_, **bold text**, `code spans`, and ~~strike throughs~~.
- Links
- Headings (ATX and Setext)
- Ordered and unordered lists
- Task (checkbox) lists
- Images
- Block quotes
- Code fences with syntax highlighting
- Rendered HTML
- Spellcheck UI when using `@prosemark/spellcheck-frontend` (you supply the dictionary / engine)

## VS Code spellcheck

The marketplace extension [**ProseMark - Code Spell Checker (cSpell) Integration**](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-cspell-integration) works alongside the main ProseMark extension and the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension to drive the same spellcheck UI in the editor.

## Getting Starting

https://prosemark.com/guides/getting-started/
