# @prosemark/typst

Typst math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered in the browser with [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) ([`@myriaddreamin/typst.ts`](https://www.npmjs.com/package/@myriaddreamin/typst.ts)).

The **`Math` / `MathMark` / `MathFormula`** Lezer nodes and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** and are part of **`prosemarkMarkdownSyntaxExtensions`**. This package adds typst.ts **widgets** and theme helpers; it **re-exports** the parser under **`typstMath*`** names if you only depend on `@prosemark/typst`.

Body text inside the delimiters is passed to Typst as math: tight `$...$` uses inline math; display rules match `@prosemark/latex` (`$$...$$` or padded single-dollar → display).

## Install

```bash
bun add @prosemark/typst
```

Peer-style WASM packages are listed as **dependencies** so bundlers resolve them. By default, **`compilerWasmUrl`** and **`rendererWasmUrl`** point at **jsDelivr** for the same **0.7.0-rc2** versions pinned in this package’s `package.json`.

## Usage

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import { typstMarkdownSyntaxTheme, typstMarkdownEditorExtensions } from '@prosemark/typst';

const extensions = [
  markdown({
    extensions: [
      GFM,
      prosemarkMarkdownSyntaxExtensions,
    ],
  }),
  ...typstMarkdownSyntaxTheme,
  ...typstMarkdownEditorExtensions(),
];
```

If you **do not** use `prosemarkMarkdownSyntaxExtensions`, add the parser from core (or the typst re-export):

```ts
import { mathMarkdownSyntaxExtension } from '@prosemark/core';
// or: import { typstMathMarkdownSyntaxExtension } from '@prosemark/typst';
```

### Options

```ts
typstMarkdownEditorExtensions({
  renderCacheSize: 128,
  // compilerWasmUrl: 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm',
  // rendererWasmUrl: 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0-rc2/pkg/typst_ts_renderer_bg.wasm',
});
```

## LaTeX vs Typst

Do **not** enable **`latexMarkdownEditorExtensions`** and **`typstMarkdownEditorExtensions`** for the same editor: both replace **`Math`** nodes.

## Limitations

- **Browser only** — needs `window` and `document`.
- **WASM URLs** are fixed after the first successful init on the page.
- First load downloads WASM and font assets (typst.ts may fetch fonts from the network).

### Block widgets and layout

Block replace widgets avoid vertical **margins**; this package uses padding, **`requestMeasure`**, and **`ResizeObserver`** when available, matching the `@prosemark/latex` approach.
