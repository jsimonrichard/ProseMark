# ProseMark for VS Code — Vim mode

Companion extension that enables **vim-style editing** in the [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor using [`@replit/codemirror-vim`](https://www.npmjs.com/package/@replit/codemirror-vim).

This is separate from VS Code Vim / vscode-neovim: install this extension only if you want modal editing inside ProseMark.

## How to use

1. Install **ProseMark** and this **ProseMark - Vim mode** integration.
2. Open a `.md` file in ProseMark — the editor starts in vim normal mode when `prosemark.vimModeEnabled` is true (default).

## Extension settings

- `prosemark.vimModeEnabled` (default `true`): enable or disable vim mode without uninstalling this extension. Changes apply to open ProseMark editors immediately (no full reload).

## Known issues

No known issues at this time.

Please report bugs on the [GitHub issues page](https://github.com/jsimonrichard/ProseMark/issues).

## Developing this extension

After `bun install`, run `bun run build`.
