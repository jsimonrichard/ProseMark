# `@prosemark/render-html`

Renders **HTML blocks** inside a ProseMark Markdown editor as sanitized DOM widgets. Inline HTML is not supported yet.

Published on npm: [`@prosemark/render-html`](https://www.npmjs.com/package/@prosemark/render-html).

## Install

```bash
bun add @prosemark/render-html @prosemark/core
```

## Usage

Add the Markdown syntax extensions, then the editor extensions:

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import {
  htmlBlockExtension,
  renderHtmlMarkdownSyntaxExtensions,
} from '@prosemark/render-html';

const extensions = [
  markdown({
    extensions: [
      GFM,
      prosemarkMarkdownSyntaxExtensions,
      renderHtmlMarkdownSyntaxExtensions,
    ],
  }),
  ...htmlBlockExtension,
];
```

### Exports

- **`renderHtmlMarkdownSyntaxExtensions`** — Parser support for multi-line HTML blocks and block continuation (CommonMark-style HTML blocks).
- **`htmlBlockExtension`** — Fold/replace decorations for `HTMLBlock` nodes: parses HTML, sanitizes with [DOMPurify](https://github.com/cure53/DOMPurify), and mounts a block widget. Uses `flow-root` layout and `requestMeasure` / `ResizeObserver` so CodeMirror line height stays correct.

Lower-level pieces (if you customize parsing):

- **`multiParHTMLBlockMarkdownSyntaxExtension`**
- **`htmlBlockContinuationMarkdownSyntaxExtension`**

## Behavior

- HTML content is **sanitized** before insertion into the DOM.
- Block widgets use an outer shell with **padding only** (no vertical margin on the widget root) and an inner `flow-root` wrapper so margins from headings and lists do not break line layout.
- Widgets set **`proseMarkSkipAdjacentArrowReveal`** so arrow-key reveal behavior from `@prosemark/core` interacts predictably with adjacent folded blocks.

## Dependencies

- `@prosemark/core` — `foldableSyntaxFacet`, `selectAllDecorationsOnSelectExtension`
- `@codemirror/state`, `@codemirror/view`
- `@lezer/markdown`, `dompurify`

## Related docs

- [Getting started](https://prosemark.com/guides/getting-started/) — full editor setup including HTML blocks
- [Features — render-html](https://prosemark.com/reference/features/#prosemarkrender-html)
