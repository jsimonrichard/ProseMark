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

- Provides tools for managing spellcheck issue state inside CodeMirror.

- Provides an underline decoration and a spellcheck suggestion tooltip
