# `@prosemark/paste-rich-text`

CodeMirror 6 extensions for **pasting clipboard HTML as Markdown** and for **paste without formatting**.

Published on npm: [`@prosemark/paste-rich-text`](https://www.npmjs.com/package/@prosemark/paste-rich-text).

## What it provides

- **`pasteRichTextExtension`** — Intercepts `paste` when the clipboard has `text/html`, converts HTML to Markdown with [Turndown](https://github.com/mixmark-io/turndown), and inserts the result. Skips conversion when the selection is inside a fenced code block.
- **`pastePlainTextExtension`** — **`Mod-Shift-V`** reads plain text from the clipboard and inserts it (bypasses rich paste).

Both accept an optional callback after insert (for example to run spellcheck or sync document state).

## Install

```bash
bun add @prosemark/paste-rich-text
```

## Usage

```ts
import {
  pasteRichTextExtension,
  pastePlainTextExtension,
} from '@prosemark/paste-rich-text';

const extensions = [pasteRichTextExtension(), pastePlainTextExtension()];
```

With callbacks (as in the [demo app](https://github.com/jsimonrichard/ProseMark/tree/main/apps/demo) and VS Code webview):

```ts
pasteRichTextExtension((event, view, from, to) => {
  // e.g. refresh decorations after paste
});

pastePlainTextExtension((view, from, to) => {
  // same
});
```

## Dependencies

- `@codemirror/view`, `@codemirror/state`, `@codemirror/language` (fenced-code detection)
- `turndown`

## Related docs

- [Features — paste-rich-text](https://prosemark.com/reference/features/#prosemarkpaste-rich-text)
