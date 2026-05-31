# `@prosemark/core`

Core [CodeMirror 6](https://codemirror.net/) extensions for building a **What You See Is What You Mean** (WYSIWYM) Markdown editor: hide syntax marks, fold list bullets and similar tokens into widgets, theme rendered-looking text, and add ProseMark-specific Markdown parsing.

Published on npm: [`@prosemark/core`](https://www.npmjs.com/package/@prosemark/core).

Full guides and API reference: [prosemark.com](https://prosemark.com/guides/getting-started/).

## Install

```bash
bun add @prosemark/core
```

You also need CodeMirror packages (peer dependencies), for example:

```bash
bun add @codemirror/view @codemirror/lang-markdown @lezer/markdown @codemirror/language-data
```

## Quick start

```ts
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';

const editor = new EditorView({
  parent: document.getElementById('editor')!,
  extensions: [
    markdown({
      codeLanguages: languages,
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    prosemarkBasicSetup(),
    prosemarkBaseThemeSetup(),
  ],
});
```

Style the editor with **`--pm-*` CSS variables** on the editor root. See [Styling](https://prosemark.com/reference/styling/).

## What it provides

### Setup bundles

- **`prosemarkBasicSetup()`** — Default hide/fold extensions, link clicking, soft indent, code-fence decorations, reveal folded blocks on arrow keys, and common CodeMirror keymaps (history, search, fold gutter, markdown formatting shortcuts, etc.).
- **`prosemarkBaseThemeSetup()`** — Base syntax highlighting and theme tokens for ProseMark markdown.
- **`prosemarkLightThemeSetup()`** — Optional light color scheme (see `basicSetup.ts`).

### Markdown parsing

Pass **`prosemarkMarkdownSyntaxExtensions`** into `markdown({ extensions: [...] })`. It bundles:

- Extra Lezer tags for styling
- YAML frontmatter (`---` … `---`)
- Nested links as plain text
- Backslash escapes for hideable syntax
- Emoji shortcodes (`:smile:`)
- En/em dash parsing
- **`mathMarkdownSyntaxExtension`** — `$...$` / `$$...$$` (render with [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex))

Individual extensions are exported from `./markdown` if you assemble your own list.

### Extension categories

Most ProseMark behavior falls into three kinds (see [Fold, Hide, & Theming](https://prosemark.com/reference/fold-hide-theme-extensions/)):

| Kind      | Role                                                    | Key APIs                                                     |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| **Hide**  | Hide syntax marks unless the cursor is on them          | `hidableNodeFacet`, `hideExtension`, `defaultHideExtensions` |
| **Fold**  | Replace syntax with widgets (bullets, tasks, images, …) | `foldableSyntaxFacet`, `defaultFoldableSyntaxExtensions`     |
| **Theme** | Syntax highlighting and editor chrome                   | `baseSyntaxHighlights`, `baseTheme`, `markdownTags`, …       |

### Other exports

- **`prosemarkMarkdownFormattingKeymap`** / **`prosemarkMarkdownFormattingKeymapExtension`** — Bold, italic, links, etc.
- **`clickLinkExtension`**, **`softIndentExtension`**, **`fixedTabWidthExtension`**, **`codeFenceExtension`**
- **`revealBlockOnArrowExtension`** — Arrow into a folded block reveals source
- **`selectAllDecorationsOnSelectExtension`** — Select-all includes widget content where configured

## Optional packages

- [`@prosemark/render-html`](https://www.npmjs.com/package/@prosemark/render-html) — HTML block widgets (DOMPurify)
- [`@prosemark/paste-rich-text`](https://www.npmjs.com/package/@prosemark/paste-rich-text) — Paste HTML as Markdown
- [`@prosemark/latex`](https://www.npmjs.com/package/@prosemark/latex) — MathJax rendering for math nodes
- [`@prosemark/spellcheck-frontend`](https://www.npmjs.com/package/@prosemark/spellcheck-frontend) — Spellcheck UI (you supply issues)

## Features

See [Features](https://prosemark.com/reference/features/#prosemarkcore) for markdown syntax coverage (headings, lists, tasks, block quotes, code fences, frontmatter, and more).
