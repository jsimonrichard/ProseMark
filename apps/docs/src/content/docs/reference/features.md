---
title: Features
description: The features of the ProseMark libraries
---

These features are illustrated in our [Demo](/demo).

## `@prosemark/core`

- Inline styles including italics, bold text, code spans, and strike-throughs. Highlights using the `==highlight==` syntax are planned.

- Both ATX Headings (`# My Heading`) and Setext Headings (headings over a line with `=====` or `-----`) are supported.

- Unordered lists using `-` and ordered lists using `1.` are supported. Ordered lists using `+` are not yet supported.

- Task lists following the `- [ ] My Task` syntax are supported.

- Images using the `![](https://image-url...)` syntax are supported. Setting the image width via GitHub like syntax is planned.

- Block quotes (including nested block quotes) are supported.

- Horizontal rules using the `---` syntax are supported.

- YAML frontmatter blocks at the top of a document (`---` ... `---`) are supported and parsed as YAML.

## `@prosemark/render-html`

- HTML Blocks inside markdown can be rendered. HTML content is sanitized using [DOMPurify](https://github.com/cure53/DOMPurify).

- Inline HTML is not supported yet.

## `@prosemark/paste-rich-text`

- Makes it possible to paste rich text as fully-formatted markdown.

- Provides the `Ctrl/Cmd+Shift+V` command for pasting without formatting.

## `@prosemark/spellcheck-frontend`

- Optional add-on for CodeMirror 6. It does **not** include a dictionary or spelling engine; you compute `SpellcheckIssue` ranges (for example with [nspell](https://github.com/wooorm/nspell) or a remote API) and expose them through the `spellcheckIssues` facet.

- Renders wavy underlines for misspelled ranges and keeps decorations mapped across document edits so ranges stay valid.

- Shows a tooltip on interaction (including keyboard shortcuts from `spellcheckKeymap`): suggestions from the issue and/or from an async `suggestionFetcher` facet, plus optional custom actions via `spellcheckActions` (for example “add to word list”).

- Theme hooks via CSS variables for underline and tooltip colors; see the [getting started](/guides/getting-started/) guide for variable names used in the demo.
