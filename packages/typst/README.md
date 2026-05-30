# @prosemark/typst

Typst math for ProseMark’s Markdown editor: `$...$` and `$$...$$`, rendered in the browser with [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) ([`@myriaddreamin/typst.ts`](https://www.npmjs.com/package/@myriaddreamin/typst.ts)).

The **`Math` / `MathMark` / `MathFormula`** Lezer nodes and **`mathMarkdownSyntaxExtension`** live in **`@prosemark/core`** and are part of **`prosemarkMarkdownSyntaxExtensions`**. This package adds typst.ts **widgets** and theme helpers; it **re-exports** the parser under **`typstMath*`** names if you only depend on `@prosemark/typst`.

Body text inside the delimiters is passed to Typst as math: tight `$...$` uses inline math; display rules match `@prosemark/latex` (`$$...$$` or padded single-dollar → display).

## Install

```bash
bun add @prosemark/typst
```

**`@myriaddreamin/typst-ts-web-compiler`** and **`@myriaddreamin/typst-ts-renderer`** are **dependencies** (JS glue for typst.ts). By default, the **`.wasm`** binaries load from **jsDelivr** (pinned to the same version as this package’s typst.ts deps)—they are **not** bundled into your app. Override with **`compilerWasmUrl`** / **`rendererWasmUrl`** to self-host or use another CDN.

## Usage

```ts
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import {
  typstMarkdownSyntaxTheme,
  typstMarkdownEditorExtensions,
} from '@prosemark/typst';

const extensions = [
  markdown({
    extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
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
import {
  jsdelivrTypstWasmUrls,
  typstMarkdownEditorExtensions,
} from '@prosemark/typst';

typstMarkdownEditorExtensions({
  renderCacheSize: 128,
  ...jsdelivrTypstWasmUrls(), // default; explicit if you prefer
});
```

To **bundle WASM with Vite** instead (e.g. offline), import the `.wasm` assets in your app and pass URLs:

```ts
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';

typstMarkdownEditorExtensions({
  compilerWasmUrl: compilerWasm,
  rendererWasmUrl: rendererWasm,
});
```

## LaTeX vs Typst

Do **not** enable **`latexMarkdownEditorExtensions`** and **`typstMarkdownEditorExtensions`** for the same editor: both replace **`Math`** nodes. Typst widgets use the class **`cm-typst-math`** (exported as **`typstMathWidgetClass`**); LaTeX/MathJax uses **`cm-latex-math`**. If you see `cm-latex-math` in the DOM, the editor is still loading **`@prosemark/latex`**, not this package.

Try the live [Typst math demo](/demo/typst) on the docs site (the main [Demo](/demo) uses MathJax).

## Limitations

- **Browser only** — needs `window` and `document`.
- **WASM URLs** are fixed after the first successful init on the page.
- First load downloads WASM and font assets (typst.ts may fetch fonts from the network).

### Block widgets and layout

Block replace widgets avoid vertical **margins**; this package uses padding, **`requestMeasure`**, and **`ResizeObserver`** when available, matching the `@prosemark/latex` approach.
