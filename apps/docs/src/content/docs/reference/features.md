---
title: Features
description: The features of the ProseMark libraries
---

These features are illustrated in our [Demo](/demo).

## `@prosemark/core`

- Inline styles including italics, bold text, code spans, and strike-throughs. Highlights using the `==highlight==` syntax are planned.

- Links (`[label](url)` and GFM autolinks). Hosts can override open behavior with the last-wins [`clickLinkHandler`](/api/prosemark/core/variables/clicklinkhandler/) facet. Pointer placement over hidden marks uses [`visiblePosAtCoords`](/api/prosemark/core/functions/visibleposatcoords/) (see [Fold, Hide, & Theming](/reference/fold-hide-theme-extensions/#pointer-coordinates-visibleposatcoords)).

- Both ATX Headings (`# My Heading`) and Setext Headings (headings over a line with `=====` or `-----`) are supported.

- Unordered lists using `-` and ordered lists using `1.` are supported. Ordered lists using `+` are not yet supported.

- Task lists following the `- [ ] My Task` syntax are supported.

- Images using the `![](https://image-url...)` syntax are supported. Setting the image width via GitHub like syntax is planned.

- Block quotes (including nested block quotes) are supported.

- Fenced code blocks with language highlighting (via `@codemirror/language-data` or your own `codeLanguages`).

- Horizontal rules using the `---` syntax are supported.

- YAML frontmatter blocks at the top of a document (`---` ... `---`) are supported and parsed as YAML.

## `@prosemark/render-html`

- HTML Blocks inside markdown can be rendered. HTML content is sanitized using [DOMPurify](https://github.com/cure53/DOMPurify).

- Paragraphs that contain **only** HTML tags (for example a lone `<span>` or `<a>`) are folded with the same block widget; mixed prose with inline HTML tags is not widgetized yet.

- Folded HTML blocks use **block** replace widgets: an outer shell avoids vertical margins (padding only), and an inner `flow-root` wrapper contains margins from rendered elements (for example headings) so CodeMirror’s line layout stays accurate. `requestMeasure` runs after updates and when the widget resizes (`ResizeObserver` where available).

- Links inside HTML widgets open through the shared [`clickLinkHandler`](/api/prosemark/core/variables/clicklinkhandler/) facet (pointer and keyboard); non-link clicks still place the editor cursor.

## `@prosemark/paste-rich-text`

- Makes it possible to paste rich text as fully-formatted markdown.

- Pastes HTML anchors whose visible text equals the `href` as a bare URL (instead of `[url](url)`), so GFM autolink rendering can apply.

- Provides the `Ctrl/Cmd+Shift+V` command for pasting without formatting.

## `@prosemark/spellcheck-frontend`

- Does **not** include a dictionary or spelling engine; you compute `SpellcheckIssue` ranges (for example with [nspell](https://github.com/wooorm/nspell) or a remote API) and expose them through the `spellcheckIssues` facet.

- Renders wavy underlines for misspelled ranges and keeps decorations mapped across document edits so ranges stay valid.

- Shows a tooltip on interaction (including keyboard shortcuts from `spellcheckKeymap`): suggestions from the issue and/or from an async `suggestionFetcher` facet, plus custom actions via `spellcheckActions` (for example “add to word list”).

## `@prosemark/latex`

- Dollar-delimited math (`$...$` / `$$...$$`) is parsed as `Math` nodes when [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/) is enabled (included in [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/)). `latexMathMarkdownSyntaxExtension` is a re-export of that extension. Add [`latexMathNestedHighlightExtension`](/api/prosemark/latex/variables/latexmathnestedhighlightextension/) from `@prosemark/latex` for nested TeX (`stexMath`) highlighting inside `MathFormula`.

- Rendered with MathJax via `latexMarkdownEditorExtensions()` and `latexMarkdownSyntaxTheme`.

- Block vs inline: `$$...$$` is always block; `$ ... $` with inner padding is block; tight `$...$` is inline.

- See the [LaTeX math guide](/guides/latex-math/) for MathJax loading and setup.
